import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image } from 'react-native';
import { useAuth } from '../AuthContext';
import { t } from '../utils/i18n';

export default function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const resolveMessage = (key?: string) => {
    if (!key) return t('common.error', undefined, 'エラーが発生しました');
    if (key === 'fill_required') return t('auth.fillRequired', undefined, 'ユーザー名とパスワードを入力してください。');
    if (key === 'password_rule') return t('auth.passwordRule', undefined, 'パスワードは4文字以上にしてください。');
    if (key === 'password_mismatch') return t('auth.passwordMismatch', undefined, '確認用パスワードが一致しません。');
    if (key === 'user_exists') return t('auth.userExists', undefined, 'そのユーザー名は既に登録済みです。');
    if (key === 'login_failed') return t('auth.loginFailed', undefined, 'ユーザー名またはパスワードが違います。');
    if (key === 'signup_failed') return t('auth.signupFailed', undefined, '新規登録に失敗しました。');
    return t('common.error', undefined, 'エラーが発生しました');
  };

  const onSubmit = async () => {
    if (mode === 'signup') {
      const result = await signup(username, password, confirmPassword);
      if (!result.ok) {
        setMessage(resolveMessage(result.message));
        return;
      }
      setMessage(t('auth.signupSuccess', undefined, '新規登録が完了しました。ログイン中です。'));
    } else {
      const result = await login(username, password);
      if (!result.ok) {
        setMessage(resolveMessage(result.message));
        return;
      }
      setMessage(t('auth.loginSuccess', { username: username.trim() }, `${username.trim()} でログインしました。`));
    }

    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <View style={styles.hero}>
        <View style={styles.heroIconWrap}>
          <Image source={require('../assets/weather.png')} style={styles.logoImage} />
        </View>
        <Text style={styles.heroTitle}>{t('app.title', undefined, '天気予報')}</Text>
        <Text style={styles.heroSubtitle}>
          {t('app.subtitle', { prefecture: t('prefectures.Tokyo', undefined, '東京都') }, '天気の更新情報をすばやくチェック')}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{t('auth.title', undefined, 'アカウント')}</Text>

        <View style={styles.modeRow}>
          <Pressable onPress={() => setMode('login')} style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === 'login' && styles.modeButtonTextActive]}>{t('auth.login', undefined, 'ログイン')}</Text>
          </Pressable>
          <Pressable onPress={() => setMode('signup')} style={[styles.modeButton, mode === 'signup' && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === 'signup' && styles.modeButtonTextActive]}>{t('auth.signup', undefined, '新規登録')}</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t('auth.username', undefined, 'ユーザー名')}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder={t('auth.password', undefined, 'パスワード')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {mode === 'signup' && (
          <TextInput
            style={styles.input}
            placeholder={t('auth.confirmPassword', undefined, 'パスワード確認')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        )}

        <Pressable style={styles.submitButton} onPress={onSubmit}>
          <Text style={styles.submitButtonText}>
            {mode === 'signup' ? t('auth.signup', undefined, '新規登録') : t('auth.login', undefined, 'ログイン')}
          </Text>
        </Pressable>

        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E9F2FF', justifyContent: 'center', padding: 16 },
  bgOrbTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: '#BBD8FF',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: -120,
    left: -70,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: '#CFE3FF',
  },
  hero: { marginBottom: 14, alignItems: 'center' },
  heroIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 3,
  },
  logoImage: { width: 46, height: 46, resizeMode: 'contain' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#0B57D0' },
  heroSubtitle: { marginTop: 4, fontSize: 13, color: '#3D5A80' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 5 },
  title: { fontSize: 22, fontWeight: '700', color: '#1976D2', marginBottom: 14, textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeButton: { flex: 1, borderWidth: 1, borderColor: '#90CAF9', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  modeButtonActive: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  modeButtonText: { color: '#1976D2', fontWeight: '700' },
  modeButtonTextActive: { color: 'white' },
  input: { height: 48, borderRadius: 10, backgroundColor: '#F2F6FC', marginBottom: 10, paddingHorizontal: 10 },
  submitButton: { marginTop: 8, borderRadius: 10, backgroundColor: '#0B57D0', paddingVertical: 12, alignItems: 'center' },
  submitButtonText: { color: 'white', fontWeight: '700' },
  message: { marginTop: 12, color: '#0D47A1', textAlign: 'center', fontWeight: '600' },
});
