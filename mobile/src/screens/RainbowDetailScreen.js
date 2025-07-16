import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ApiService } from '../services/ApiService';
import { showMessage } from 'react-native-flash-message';

const { width } = Dimensions.get('window');

const RainbowDetailScreen = ({ route, navigation }) => {
  const { rainbow: initialRainbow, rainbowId } = route.params;
  const [rainbow, setRainbow] = useState(initialRainbow);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rainbowId && !initialRainbow) {
      loadRainbowDetail();
    }
  }, [rainbowId]);

  const loadRainbowDetail = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getRainbowById(rainbowId);
      if (response.data.success) {
        setRainbow(response.data.data);
      }
    } catch (error) {
      console.error('Load rainbow detail error:', error);
      showMessage({
        message: 'Failed to load rainbow details',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: '🌈 Rainbow Sighting',
        message: `Check out this rainbow spotted in Shiojiri! ${rainbow.description || ''}`,
        url: `https://rainbowseeker.app/rainbow/${rainbow.id}`,
      };

      await Share.share(shareData);
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCoordinates = (lat, lon) => {
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  };

  if (!rainbow) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading rainbow details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {rainbow.image_url && (
        <Image
          source={{ uri: rainbow.image_url }}
          style={styles.rainbowImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Icon name="person" size={24} color="#6B46C1" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{rainbow.user_name}</Text>
              <Text style={styles.timestamp}>{formatDate(rainbow.timestamp)}</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Icon name="share" size={24} color="#6B46C1" />
          </TouchableOpacity>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            {rainbow.description || 'Beautiful rainbow sighting! 🌈'}
          </Text>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Icon name="location-on" size={20} color="#6B46C1" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>
                {formatCoordinates(rainbow.latitude, rainbow.longitude)}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Icon name="access-time" size={20} color="#6B46C1" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Spotted At</Text>
              <Text style={styles.detailValue}>
                {formatDate(rainbow.timestamp)}
              </Text>
            </View>
          </View>

          {rainbow.distance && (
            <View style={styles.detailItem}>
              <Icon name="straighten" size={20} color="#6B46C1" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Distance</Text>
                <Text style={styles.detailValue}>
                  {rainbow.distance.toFixed(1)} km away
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Map')}
          >
            <Icon name="map" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>View on Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButtonSecondary}
            onPress={() => navigation.navigate('Camera')}
          >
            <Icon name="camera-alt" size={20} color="#6B46C1" />
            <Text style={styles.actionButtonSecondaryText}>Spot Rainbow</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  rainbowImage: {
    width: width,
    height: 300,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 14,
    color: '#6B7280',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailText: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6B46C1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6B46C1',
  },
  actionButtonSecondaryText: {
    color: '#6B46C1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default RainbowDetailScreen;