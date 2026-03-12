import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Image, Alert, Linking, Platform } from 'react-native';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, uploadString } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../AuthContext';
import { useLanguage } from '../LanguageContext';
import { t } from '../utils/i18n';
import { db, functionsClient, storage } from '../utils/firebase';
import A8Banner from '../components/A8Banner';

type MediaPost = {
  id: string;
  author: string;
  authorUid: string;
  createdAt: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption: string;
  aiTags?: string[];
  aiWeatherComment?: string;
  hashtags?: string[];
};

type CreatePostErrorKind =
  | 'blocked_content'
  | 'moderation_service_error'
  | 'auth_error'
  | 'invalid_input'
  | 'unknown';

const classifyCreatePostError = (err: any): CreatePostErrorKind => {
  const code = String(err?.code || '').toLowerCase();
  const message = String(err?.message || '').toLowerCase();

  if (code.includes('unauthenticated')) {
    return 'auth_error';
  }

  if (code.includes('invalid-argument')) {
    return 'invalid_input';
  }

  if (message.includes('blocked:moderation_error')) {
    return 'moderation_service_error';
  }

  if (code.includes('permission-denied') && message.includes('blocked:')) {
    return 'blocked_content';
  }

  if (
    code.includes('unavailable') ||
    code.includes('failed-precondition') ||
    code.includes('deadline-exceeded') ||
    code.includes('internal')
  ) {
    return 'moderation_service_error';
  }

  return 'unknown';
};

const extractImageExtension = (dataUrl: string) => {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
  return match?.[1] || 'jpg';
};

const normalizeHashtag = (raw: string) => {
  const tag = String(raw || '').trim().replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
  if (!tag) return '';
  return `#${tag.toLowerCase()}`;
};

const extractHashtagsFromText = (value: string) => {
  const matches = String(value || '').match(/#[\p{L}\p{N}_]+/gu) || [];
  const unique = new Set<string>();
  for (const m of matches) {
    const normalized = normalizeHashtag(m);
    if (normalized) unique.add(normalized);
  }
  return Array.from(unique);
};

const splitCaptionByHashtag = (value: string) => {
  const text = String(value || '');
  const regex = /#[\p{L}\p{N}_]+/gu;
  const parts: Array<{ text: string; hashtag?: string }> = [];
  let lastIndex = 0;
  let match = regex.exec(text);

  while (match) {
    const start = match.index;
    const end = start + match[0].length;
    if (start > lastIndex) {
      parts.push({ text: text.slice(lastIndex, start) });
    }
    const normalized = normalizeHashtag(match[0]);
    parts.push({ text: match[0], hashtag: normalized || undefined });
    lastIndex = end;
    match = regex.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }
  return parts;
};

export default function PostScreen() {
  const { language } = useLanguage();
  const { currentUser, currentUserId } = useAuth();
  const [postMediaType, setPostMediaType] = useState<'image' | 'video'>('image');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [selectedLocalFile, setSelectedLocalFile] = useState<File | null>(null);
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [activeHashtag, setActiveHashtag] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const createModeratedPost = httpsCallable(functionsClient, 'createModeratedPost');
  const localeByLanguage: Record<string, string> = {
    ja: 'ja-JP',
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    zh: 'zh-CN',
    ko: 'ko-KR',
  };
  const dateLocale = localeByLanguage[language] || 'ja-JP';

  useEffect(() => {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const next = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as {
          author?: string;
          authorUid?: string;
          createdAt?: Timestamp;
          mediaType?: 'image' | 'video';
          mediaUrl?: string;
          caption?: string;
          aiTags?: string[];
          aiWeatherComment?: string;
        };

        return {
          id: docSnap.id,
          author: data.author || '-',
          authorUid: data.authorUid || '-',
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          mediaType: data.mediaType || 'image',
          mediaUrl: data.mediaUrl || '',
          caption: data.caption || '',
          aiTags: Array.isArray(data.aiTags) ? data.aiTags : [],
          aiWeatherComment: data.aiWeatherComment || '',
          hashtags: Array.from(
            new Set([
              ...extractHashtagsFromText(data.caption || ''),
              ...(Array.isArray(data.aiTags) ? data.aiTags : []).map((tag) => normalizeHashtag(tag)),
            ].filter(Boolean))
          ),
        } as MediaPost;
      });

      setPosts(next);
    });

    return unsubscribe;
  }, []);

  const filteredPosts = useMemo(() => {
    if (!activeHashtag) return posts;
    return posts.filter((post) => (post.hashtags || []).includes(activeHashtag));
  }, [posts, activeHashtag]);

  const openRelatedPosts = (tag: string) => {
    const normalized = normalizeHashtag(tag);
    if (!normalized) return;
    setActiveHashtag(normalized);
  };

  const renderCaption = (caption: string) => {
    const parts = splitCaptionByHashtag(caption);
    return (
      <Text style={styles.caption}>
        {parts.map((part, idx) => {
          if (part.hashtag) {
            return (
              <Text
                key={`${part.hashtag}-${idx}`}
                style={styles.captionTag}
                onPress={() => openRelatedPosts(part.hashtag || '')}
              >
                {part.text}
              </Text>
            );
          }
          return <Text key={`text-${idx}`}>{part.text}</Text>;
        })}
      </Text>
    );
  };

  const pickLocalMedia = () => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        t('posts.localUnsupportedTitle', undefined, '未対応'),
        t('posts.localUnsupportedMessage', undefined, 'ローカル画像アップロードは現在Web版のみ対応です。')
      );
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        Alert.alert(
          t('posts.localPickFailedTitle', undefined, '選択エラー'),
          t('posts.localPickFailedMessage', undefined, '画像または動画ファイルを選択してください。')
        );
        return;
      }
      setSelectedLocalFile(file);
      setPostMediaType(isVideo ? 'video' : 'image');
      setPostMediaUrl('');
    };
    input.click();
  };

  const createPost = async () => {
    if (!currentUser || !currentUserId) {
      Alert.alert(t('common.error', undefined, 'エラー'), t('posts.loginRequired', undefined, '投稿にはログインが必要です。'));
      return;
    }

    const mediaUrl = postMediaUrl.trim();
    const hasLocalFile = Platform.OS === 'web' && !!selectedLocalFile;
    const isHttpUrl = /^https?:\/\//.test(mediaUrl);
    const isDataImage = /^data:image\/[a-zA-Z0-9+.-]+;base64,/.test(mediaUrl);
    if (!hasLocalFile && (!mediaUrl || (!isHttpUrl && !isDataImage))) {
      Alert.alert(
        t('posts.invalidUrlTitle', undefined, 'URLエラー'),
        t('posts.invalidUrlMessage', undefined, 'http(s) で始まるURL、またはローカル画像/動画を選択してください。')
      );
      return;
    }

    setSubmitting(true);
    try {
      let storagePath: string | null = null;
      let finalMediaUrl = mediaUrl;
      if (hasLocalFile && selectedLocalFile) {
        const fallbackExt = postMediaType === 'video' ? 'mp4' : 'jpg';
        const fileName = selectedLocalFile.name || `upload.${fallbackExt}`;
        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        storagePath = `posts/${currentUserId}/${Date.now()}_${safeFileName}`;
        const uploadRef = ref(storage, storagePath);
        await uploadBytes(uploadRef, selectedLocalFile, {
          contentType: selectedLocalFile.type || undefined,
        });
        finalMediaUrl = await getDownloadURL(uploadRef);
      } else if (postMediaType === 'image' && isDataImage) {
        const ext = extractImageExtension(mediaUrl);
        storagePath = `posts/${currentUserId}/${Date.now()}.${ext}`;
        const uploadRef = ref(storage, storagePath);
        await uploadString(uploadRef, mediaUrl, 'data_url');
        finalMediaUrl = await getDownloadURL(uploadRef);
      }
      await createModeratedPost({
        mediaType: postMediaType,
        mediaUrl: finalMediaUrl,
        caption: postCaption.trim(),
        storagePath,
        clientMeta: {
          platform: Platform.OS,
          userAgent: Platform.OS === 'web' ? ((globalThis as any).navigator?.userAgent || '') : '',
          appVersion: '1.0.0',
          language,
        },
      });

      setPostMediaUrl('');
      setPostCaption('');
      setSelectedLocalFile(null);
    } catch (e: any) {
      console.error('Create post failed:', e);
      const errorKind = classifyCreatePostError(e);

      if (errorKind === 'blocked_content') {
        Alert.alert(
          t('posts.moderationBlockedTitle', undefined, '投稿ブロック'),
          t('posts.moderationBlockedMessage', undefined, 'この投稿は安全基準により公開できません。')
        );
        return;
      }

      if (errorKind === 'moderation_service_error') {
        Alert.alert(
          t('posts.moderationServiceErrorTitle', undefined, '投稿を処理できません'),
          t('posts.moderationServiceErrorMessage', undefined, '現在モデレーション処理が不安定です。時間をおいて再試行してください。')
        );
        return;
      }

      if (errorKind === 'auth_error') {
        Alert.alert(
          t('common.error', undefined, 'エラー'),
          t('posts.loginRequired', undefined, '投稿にはログインが必要です。')
        );
        return;
      }

      if (errorKind === 'invalid_input') {
        Alert.alert(
          t('posts.invalidUrlTitle', undefined, '入力エラー'),
          t('posts.invalidInputMessage', undefined, '入力内容を確認して再試行してください。')
        );
        return;
      }

      Alert.alert(
        t('posts.submitFailedTitle', undefined, '投稿失敗'),
        t('posts.submitFailedMessage', undefined, '投稿の保存に失敗しました。時間をおいて再試行してください。')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const postingAsLabel = useMemo(
    () => t('posts.postingAs', { username: currentUser || '-' }, `${currentUser || '-'} として投稿`),
    [currentUser]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('posts.title', undefined, '天気フォト・動画投稿')}</Text>
        <Text style={styles.subtitle}>{postingAsLabel}</Text>

        <View style={styles.typeRow}>
          <Pressable style={[styles.typeButton, postMediaType === 'image' && styles.typeButtonActive]} onPress={() => setPostMediaType('image')}>
            <Text style={[styles.typeButtonText, postMediaType === 'image' && styles.typeButtonTextActive]}>{t('posts.photo', undefined, '写真')}</Text>
          </Pressable>
          <Pressable style={[styles.typeButton, postMediaType === 'video' && styles.typeButtonActive]} onPress={() => setPostMediaType('video')}>
            <Text style={[styles.typeButtonText, postMediaType === 'video' && styles.typeButtonTextActive]}>{t('posts.video', undefined, '動画')}</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.input}
          value={postMediaUrl}
          onChangeText={setPostMediaUrl}
          placeholder={t('posts.urlPlaceholder', undefined, 'https:// で始まるメディアURL')}
          autoCapitalize="none"
        />
        <Pressable style={styles.localButton} onPress={pickLocalMedia}>
          <Text style={styles.localButtonText}>{t('posts.pickLocalImage', undefined, '端末から画像/動画を選択')}</Text>
        </Pressable>
        {!!selectedLocalFile && (
          <Text style={styles.selectedFileText}>
            {t('posts.selectedFile', { fileName: selectedLocalFile.name }, `選択中: ${selectedLocalFile.name}`)}
          </Text>
        )}
        <TextInput
          style={[styles.input, styles.captionInput]}
          value={postCaption}
          onChangeText={setPostCaption}
          placeholder={t('posts.captionPlaceholder', undefined, 'コメント（任意）')}
          multiline
        />

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={createPost} disabled={submitting}>
          <Text style={styles.submitButtonText}>{submitting ? t('common.loading', undefined, '処理中...') : t('posts.submit', undefined, '投稿する')}</Text>
        </Pressable>
      </View>

      <View style={styles.listSection}>
        {!!activeHashtag && (
          <View style={styles.filterBanner}>
            <Text style={styles.filterBannerText}>
              {t('posts.relatedFilter', { tag: activeHashtag }, `${activeHashtag} の関連投稿`)}
            </Text>
            <Pressable onPress={() => setActiveHashtag('')}>
              <Text style={styles.filterClearText}>{t('common.clear', undefined, '解除')}</Text>
            </Pressable>
          </View>
        )}
        {filteredPosts.length === 0 && <Text style={styles.empty}>{t('posts.empty', undefined, '投稿はまだありません。')}</Text>}
        {filteredPosts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <Text style={styles.meta}>{post.author} · {new Date(post.createdAt).toLocaleString(dateLocale)}</Text>
            {post.mediaType === 'image' ? (
              <Image source={{ uri: post.mediaUrl }} style={styles.image} />
            ) : (
              <Pressable onPress={() => Linking.openURL(post.mediaUrl)} style={styles.videoButton}>
                <Text style={styles.videoButtonText}>{t('posts.openVideo', undefined, '動画を開く')}</Text>
              </Pressable>
            )}
            {!!post.caption && renderCaption(post.caption)}
            {!!post.aiWeatherComment && (
              <Text style={styles.aiComment}>
                {t('posts.aiWeatherComment', undefined, 'AI天気コメント')}: {post.aiWeatherComment}
              </Text>
            )}
            {!!post.hashtags?.length && (
              <View style={styles.tagsRow}>
                {post.hashtags.map((tag) => (
                  <Pressable
                    key={`${post.id}-${tag}`}
                    style={[styles.tagChip, activeHashtag === tag && styles.tagChipActive]}
                    onPress={() => openRelatedPosts(tag)}
                  >
                    <Text style={[styles.tagChipText, activeHashtag === tag && styles.tagChipTextActive]}>
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      <A8Banner placement="post_bottom" mode="rotate" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 12, paddingBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 14, elevation: 3 },
  title: { fontSize: 18, fontWeight: '700', color: '#1976D2', marginBottom: 6 },
  subtitle: { color: '#455A64', marginBottom: 10 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeButton: { flex: 1, borderWidth: 1, borderColor: '#90CAF9', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  typeButtonText: { color: '#1976D2', fontWeight: '700' },
  typeButtonTextActive: { color: 'white' },
  input: { height: 46, borderRadius: 8, backgroundColor: '#F5F5F5', paddingHorizontal: 10, marginBottom: 10 },
  localButton: { marginBottom: 10, borderRadius: 8, borderWidth: 1, borderColor: '#90CAF9', paddingVertical: 10, alignItems: 'center' },
  localButtonText: { color: '#1565C0', fontWeight: '700' },
  selectedFileText: { marginBottom: 10, color: '#455A64', fontSize: 12 },
  captionInput: { minHeight: 80, height: 'auto', textAlignVertical: 'top', paddingTop: 10 },
  submitButton: { backgroundColor: '#1976D2', borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: 'white', fontWeight: '700' },
  listSection: { marginTop: 12, gap: 10 },
  filterBanner: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterBannerText: { color: '#1565C0', fontWeight: '700' },
  filterClearText: { color: '#1976D2', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#999', marginTop: 20 },
  aiComment: { marginTop: 8, color: '#1E88E5', fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  tagChip: {
    backgroundColor: '#E8F3FF',
    borderColor: '#90CAF9',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  tagChipText: { color: '#1565C0', fontWeight: '700' },
  tagChipTextActive: { color: '#FFFFFF' },
  postCard: { backgroundColor: 'white', borderRadius: 10, padding: 12, elevation: 2 },
  meta: { fontSize: 12, color: '#607D8B', marginBottom: 8 },
  image: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#CFD8DC' },
  videoButton: { backgroundColor: '#E3F2FD', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  videoButtonText: { color: '#1565C0', fontWeight: '700' },
  caption: { marginTop: 8, color: '#37474F' },
  captionTag: { color: '#1565C0', fontWeight: '700' },
});
