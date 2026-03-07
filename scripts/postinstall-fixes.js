const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function ensureFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf8') !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function patchFileReplace(filePath, searchValue, replaceValue) {
  if (!fs.existsSync(filePath)) return { changed: false, skipped: true };
  const original = fs.readFileSync(filePath, 'utf8');
  if (original.includes(replaceValue)) return { changed: false, skipped: false };
  if (!original.includes(searchValue)) return { changed: false, skipped: true };
  const updated = original.replace(searchValue, replaceValue);
  fs.writeFileSync(filePath, updated, 'utf8');
  return { changed: true, skipped: false };
}

function run() {
  const moduleRoot = path.join(
    projectRoot,
    'node_modules',
    'react-native-google-mobile-ads',
    'android'
  );

  if (!fs.existsSync(moduleRoot)) {
    console.log('[postinstall-fixes] react-native-google-mobile-ads not found, skipping.');
    return;
  }

  const specPath = path.join(
    moduleRoot,
    'src',
    'oldarch',
    'io',
    'invertase',
    'googlemobileads',
    'NativeAppModuleSpec.java'
  );

  const specContent = `package io.invertase.googlemobileads;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReadableMap;

abstract class NativeAppModuleSpec extends ReactContextBaseJavaModule {
  static final String NAME = "RNAppModule";

  NativeAppModuleSpec(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return NAME;
  }

  public abstract void initializeApp(ReadableMap options, ReadableMap appConfig, Promise promise);

  public abstract void setAutomaticDataCollectionEnabled(String appName, boolean enabled);

  public abstract void deleteApp(String appName, Promise promise);

  public abstract void eventsNotifyReady(boolean ready);

  public abstract void eventsGetListeners(Promise promise);

  public abstract void eventsPing(String eventName, ReadableMap eventBody, Promise promise);

  public abstract void eventsAddListener(String eventName);

  public abstract void eventsRemoveListener(String eventName, boolean all);

  public abstract void addListener(String eventName);

  public abstract void removeListeners(double count);

  public abstract void metaGetAll(Promise promise);

  public abstract void jsonGetAll(Promise promise);

  public abstract void preferencesSetBool(String key, boolean value, Promise promise);

  public abstract void preferencesSetString(String key, String value, Promise promise);

  public abstract void preferencesGetAll(Promise promise);

  public abstract void preferencesClearAll(Promise promise);
}
`;

  const commonPath = path.join(
    moduleRoot,
    'src',
    'main',
    'java',
    'io',
    'invertase',
    'googlemobileads',
    'ReactNativeGoogleMobileAdsCommon.java'
  );

  const searchSnippet =
    'return AdSize.getLargeAnchoredAdaptiveBannerAdSize(reactViewGroup.getContext(), adWidth);';
  const replaceSnippet =
    'return AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(\n' +
    '            reactViewGroup.getContext(), adWidth);';

  const specChanged = ensureFile(specPath, specContent);
  const commonResult = patchFileReplace(commonPath, searchSnippet, replaceSnippet);

  console.log(
    `[postinstall-fixes] react-native-google-mobile-ads: ` +
      `spec=${specChanged ? 'updated' : 'ok'}, ` +
      `common=${commonResult.changed ? 'updated' : commonResult.skipped ? 'skipped' : 'ok'}`
  );
}

run();
