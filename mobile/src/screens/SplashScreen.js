import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#6B46C1');
  }, []);

  return (
    <LinearGradient
      colors={['#6B46C1', '#8B5CF6', '#A78BFA']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6B46C1" />
      
      <Animatable.View
        animation="fadeInDown"
        duration={1000}
        style={styles.logoContainer}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.rainbowIcon}>🌈</Text>
        </View>
        
        <Animatable.Text
          animation="fadeInUp"
          duration={1000}
          delay={500}
          style={styles.title}
        >
          Rainbow Seeker
        </Animatable.Text>
        
        <Animatable.Text
          animation="fadeInUp"
          duration={1000}
          delay={800}
          style={styles.subtitle}
        >
          Shiojiri City
        </Animatable.Text>
      </Animatable.View>

      <Animatable.View
        animation="fadeInUp"
        duration={1000}
        delay={1200}
        style={styles.bottomContainer}
      >
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBar}>
            <Animatable.View
              animation="slideInLeft"
              duration={1500}
              delay={1500}
              style={styles.loadingProgress}
            />
          </View>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Animatable.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 100,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  rainbowIcon: {
    fontSize: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#F3F4F6',
    textAlign: 'center',
    opacity: 0.9,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    width: '100%',
  },
  loadingText: {
    fontSize: 16,
    color: '#F3F4F6',
    opacity: 0.8,
  },
});

export default SplashScreen;