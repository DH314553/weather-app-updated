export default {
  expo: {
    name: "天気予報アプリ(Stogia)",
    slug: "weather-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/weather.png",
    userInterfaceStyle: "light",

    splash: {
      image: "./assets/weather.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },

    updates: {
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/efb2f5b3-2d4a-4f5c-8f12-1b3e5c8e4f12"
    },

    assetBundlePatterns: ["assets/**"],

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.daisaku31469.weatherapp",
      infoPlist: {
        UIBackgroundModes: ["fetch", "remote-notification"]
      }
    },

    android: {
      package: "com.daisaku31469.weatherapp",
      googleServicesFile: "./google-services.json",

      adaptiveIcon: {
        foregroundImage: "./assets/weather.png",
        backgroundColor: "#ffffff"
      },

      permissions: [
        "NOTIFICATIONS",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.POST_NOTIFICATIONS",
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK"
      ]
    },

    web: {
      favicon: "./assets/weather.png"
    },

    newArchEnabled: false,

    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow $(PRODUCT_NAME) to use your location."
        }
      ],

      [
        "expo-notifications",
        {
          icon: "./assets/weather.png",
          color: "#1976D2"
        }
      ],

      "expo-background-fetch",
      "expo-task-manager",
      "expo-localization",

      [
        "expo-build-properties",
        {
          android: {
            enableProguardInReleaseBuilds: true,
            shrinkResources: true,
            enableSeparateBuildPerCPUArchitecture: true
          }
        }
      ]
    ],

    extra: {
      eas: {
        projectId: "f1a783ce-61ca-4a1f-845a-fdadd7fafc3b"
      }
    },

    owner: "daisaku31469"
  }
};
