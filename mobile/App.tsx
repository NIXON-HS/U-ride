import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold, Outfit_900Black } from '@expo-google-fonts/outfit';

import { useAuthStore } from './src/store/userStore';
import { COLORS } from './src/theme/design';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PublishRideScreen from './src/screens/PublishRideScreen';
import DriverScreen from './src/screens/DriverScreen';
import ReportScreen from './src/screens/ReportScreen';
import RateScreen from './src/screens/RateScreen';
import PassengerRequestsScreen from './src/screens/PassengerRequestsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabBarStyle = {
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: COLORS.border,
  height: Platform.OS === 'ios' ? 85 : 68,
  paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  paddingTop: 8,
  elevation: 12,
  shadowColor: '#6366F1',
  shadowOpacity: 0.1,
  shadowRadius: 12,
};

function PasajeroTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: true, tabBarStyle,
      tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.lightGray,
      tabBarLabelStyle: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, marginTop: 2 },
    }}>
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ title: 'Viajes', tabBarIcon: ({ color, size }) => <Ionicons name="car-sport-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Requests" component={PassengerRequestsScreen}
        options={{ title: 'Solicitudes', tabBarIcon: ({ color, size }) => <Ionicons name="mail-unread-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Report" component={ReportScreen}
        options={{ title: 'Reportar', tabBarIcon: ({ color, size }) => <Ionicons name="flag-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}

function ConductorTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: true, tabBarStyle,
      tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.lightGray,
      tabBarLabelStyle: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, marginTop: 2 },
    }}>
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ title: 'Viajes', tabBarIcon: ({ color, size }) => <Ionicons name="car-sport-outline" size={size} color={color} /> }} />
      <Tab.Screen name="PublishRide" component={PublishRideScreen}
        options={{ title: 'Publicar', tabBarIcon: ({ color, size, focused }) =>
          <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={focused ? 32 : size} color={focused ? COLORS.secondary : color} />,
          tabBarActiveTintColor: COLORS.secondary,
        }}
      />
      <Tab.Screen name="Driver" component={DriverScreen}
        options={{ title: 'Solicitudes', tabBarIcon: ({ color, size }) => <Ionicons name="mail-unread-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Report" component={ReportScreen}
        options={{ title: 'Reportar', tabBarIcon: ({ color, size }) => <Ionicons name="flag-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}

function RoleBasedTabs({ rol }: { rol: string }) {
  if (rol === 'CONDUCTOR') return <ConductorTabs />;
  return <PasajeroTabs />;
}

export default function App() {
  const checkAuth  = useAuthStore(state => state.checkAuth);
  const token      = useAuthStore(state => state.token);
  const user       = useAuthStore(state => state.user);
  const isLoading  = useAuthStore(state => state.isLoading);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold,
    Outfit_700Bold, Outfit_800ExtraBold, Outfit_900Black,
  });

  useEffect(() => { checkAuth(); }, []);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {token == null ? (
            <Stack.Group>
              <Stack.Screen name="Login"    component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </Stack.Group>
          ) : (
            <Stack.Group>
              <Stack.Screen name="MainTabs">
                {() => <RoleBasedTabs rol={user?.rol ?? 'PASAJERO'} />}
              </Stack.Screen>
              <Stack.Screen name="Rate" component={RateScreen} options={{ presentation: 'modal' }} />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
