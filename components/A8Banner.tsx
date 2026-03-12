import React, { useMemo } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { logEvent } from '../utils/analytics';

const A8_CLICK_URL = 'https://px.a8.net/svt/ejp?a8mat=4AZ7S2+5YC3BU+2PEO+OJWZL';
const A8_IMAGE_URL = 'https://www29.a8.net/svt/bgt?aid=260303906360&wid=002&eno=01&mid=s00000012624004124000&mc=1';
const A8_PIXEL_URL = 'https://www12.a8.net/0.gif?a8mat=4AZ7S2+5YC3BU+2PEO+OJWZL';
const A8_ASPECT_RATIO = 320 / 50;

type Props = {
  placement?: string;
};

const A8Banner = ({ placement = 'home_bottom' }: Props) => {
  const { width } = useWindowDimensions();
  const bannerWidth = Math.min(320, Math.max(0, width - 24));
  const bannerHeight = useMemo(() => Math.round(bannerWidth / A8_ASPECT_RATIO), [bannerWidth]);

  const handlePress = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(A8_CLICK_URL, '_blank', 'noopener,noreferrer');
    } else {
      await Linking.openURL(A8_CLICK_URL);
    }
    logEvent('affiliate_click', { placement, network: 'a8', campaign: '4AZ7S2+5YC3BU+2PEO+OJWZL' }).catch(() => {});
  };

  if (bannerWidth <= 0) return null;

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={handlePress} accessibilityRole="link">
        <Image
          source={{ uri: A8_IMAGE_URL }}
          style={[styles.banner, { width: bannerWidth, height: bannerHeight }]}
          resizeMode="contain"
        />
      </Pressable>
      <Image source={{ uri: A8_PIXEL_URL }} style={styles.pixel} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 12,
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
