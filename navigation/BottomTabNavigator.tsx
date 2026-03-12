import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import App from "../screens/App";
import SettingsScreen from "../screens/SettingsScreen";
import WorldWeatherScreen from "../screens/WorldWeatherScreen";
import PostScreen from "../screens/PostScreen";
import AuthScreen from "../screens/AuthScreen";
import { useAuth } from "../AuthContext";
import { t } from '../utils/i18n';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  const { currentUser, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string = "";

            if (route.name === "Home") {
              iconName = focused ? "home" : "weather-sunny";
            } else if (route.name === "Post") {
              iconName = focused ? "image-multiple" : "image-multiple-outline";
            } else if (route.name === "World") {
              iconName = focused ? "earth" : "earth";
            } else if (route.name === "Settings") {
              iconName = focused ? "cog" : "cog-outline";
            } else {
              iconName = "help-circle";
            }

            return (
              <MaterialCommunityIcons 
                name={iconName as any} 
                size={focused ? size + 4 : size} 
                color={color} 
                style={{ marginBottom: 4 }}
              />
            );
          },
          tabBarActiveTintColor: "#1976D2",
          tabBarInactiveTintColor: "#B0BEC5",
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopColor: "#E0E0E0",
            borderTopWidth: 1,
            height: 65,
            paddingBottom: 10,
            paddingTop: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 5,
          },
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: "600",
            marginTop: 4,
          },
        })}
      >
        {!currentUser ? (
          <Tab.Screen
            name="Auth"
            component={AuthScreen}
            options={() => ({ headerShown: false, tabBarStyle: { display: 'none' } })}
          />
        ) : (
          <>
            <Tab.Screen
              name="Home"
              component={App}
              options={() => ({ tabBarLabel: t('app.title', undefined, '天気予報') })}
            />
            <Tab.Screen
              name="Post"
              component={PostScreen}
              options={() => ({ tabBarLabel: t('posts.title', undefined, '投稿') })}
            />
            <Tab.Screen
              name="World"
              component={WorldWeatherScreen}
              options={() => ({ tabBarLabel: t('world.title', undefined, '世界の天気') })}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsScreen}
              options={() => ({ tabBarLabel: t('settings.title', undefined, '設定') })}
            />
          </>
        )}
      </Tab.Navigator>
    </NavigationContainer>
  );
}
