import Geolocation from 'react-native-geolocation-service';
import { Platform, Alert, Linking } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export class LocationService {
  static async requestLocationPermission() {
    if (Platform.OS === 'android') {
      const permission = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      return permission === RESULTS.GRANTED;
    } else {
      const permission = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      return permission === RESULTS.GRANTED;
    }
  }

  static async getCurrentLocation() {
    try {
      const hasPermission = await this.requestLocationPermission();
      
      if (!hasPermission) {
        Alert.alert(
          'Location Permission Required',
          'This app needs location permission to work properly. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return null;
      }

      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            resolve({
              latitude,
              longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            });
          },
          (error) => {
            console.error('Location error:', error);
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000
          }
        );
      });
    } catch (error) {
      console.error('getCurrentLocation error:', error);
      throw error;
    }
  }

  static async watchLocation(callback) {
    try {
      const hasPermission = await this.requestLocationPermission();
      
      if (!hasPermission) {
        throw new Error('Location permission not granted');
      }

      const watchId = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          callback({
            latitude,
            longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          console.error('Watch location error:', error);
          callback(null, error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10, // Update every 10 meters
          interval: 5000, // Update every 5 seconds
          fastestInterval: 2000
        }
      );

      return watchId;
    } catch (error) {
      console.error('watchLocation error:', error);
      throw error;
    }
  }

  static clearWatch(watchId) {
    Geolocation.clearWatch(watchId);
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static isWithinShiojiriArea(latitude, longitude) {
    const shiojiriLat = 36.1127;
    const shiojiriLon = 137.9545;
    const maxDistance = 50; // 50km radius
    
    const distance = this.calculateDistance(latitude, longitude, shiojiriLat, shiojiriLon);
    return distance <= maxDistance;
  }

  static formatCoordinates(latitude, longitude) {
    const latDirection = latitude >= 0 ? 'N' : 'S';
    const lonDirection = longitude >= 0 ? 'E' : 'W';
    
    return {
      latitude: `${Math.abs(latitude).toFixed(6)}°${latDirection}`,
      longitude: `${Math.abs(longitude).toFixed(6)}°${lonDirection}`
    };
  }

  static async getLocationName(latitude, longitude) {
    try {
      // This would require a reverse geocoding service
      // For now, return a simple area name
      if (this.isWithinShiojiriArea(latitude, longitude)) {
        return 'Shiojiri Area';
      }
      return 'Unknown Location';
    } catch (error) {
      console.error('getLocationName error:', error);
      return 'Unknown Location';
    }
  }
}