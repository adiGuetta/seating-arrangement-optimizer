import { Platform, Alert } from 'react-native';

export function alertOk(title: string, message?: string) {
  if (Platform.OS === 'web') { window.alert(message ? `${title}\n${message}` : title); }
  else { Alert.alert(title, message); }
}

export function alertConfirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') { if (confirm(`${title}\n${message}`)) onConfirm(); }
  else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', style: 'destructive', onPress: onConfirm },
    ]);
  }
}
