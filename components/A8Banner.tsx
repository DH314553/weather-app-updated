import React, { useMemo } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { logEvent } from '../utils/analytics';
import { A8_ADS, A8Ad } from '../utils/a8Ads';

type Props = {
  placement?: string;
  ads?: A8Ad[];
  mode?: 'stack' | 'rotate';
};

const A8Banner = ({ placement = 'home_bottom', ads = A8_ADS, mode = 'stack' }: Props) => {
  const { width } = useWindowDimensions();
  const containerWidth = Math.max(0, width - 24);

  const visibleAds = useMemo(() => {
    if (ads.length === 0) return [];
    if (mode === 'rotate') {
      const idx = Math.floor(Date.now() / (1000 * 60)) % ads.length;
      return [ads[idx]];
    }
    return ads;
  }, [ads, mode]);

  const handlePress = async (ad: A8Ad) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(ad.clickUrl, '_blank', 'noopener,noreferrer');
    } else {
      await Linking.openURL(ad.clickUrl);
    }
    logEvent('affiliate_click', { placement, network: 'a8', campaign: ad.id }).catch(() => {});
  };

  if (containerWidth <= 0 || visibleAds.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      {visibleAds.map((ad) => {
        const aspectRatio = ad.width / ad.height;
        const bannerWidth = Math.min(ad.width, containerWidth);
        const bannerHeight = Math.round(bannerWidth / aspectRatio);

        return (
          <View key={ad.id} style={styles.adBlock}>
            <Pressable onPress={() => handlePress(ad)} accessibilityRole="link">
              <Image
                source={{ uri: ad.imageUrl }}
                style={[styles.banner, { width: bannerWidth, height: bannerHeight }]}
                resizeMode="contain"
              />
            </Pressable>
            <Image source={{ uri: ad.pixelUrl }} style={styles.pixel} />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  adBlock: {
    alignItems: 'center',
    marginBottom: 10,
  },
  banner: {
    borderRadius: 6,
  },
  pixel: {
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export default A8Banner;
