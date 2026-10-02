import { Platform, Share } from 'react-native';
import { notify } from '../components/ui';

export async function shareText(title: string, message: string) {
  try {
    if (Platform.OS === 'web') {
      const nav = (globalThis as any).navigator;
      if (nav?.share) {
        await nav.share({ title, text: message });
      } else if (nav?.clipboard) {
        await nav.clipboard.writeText(message);
        notify('Copiado', 'El reporte se copió al portapapeles.');
      }
      return;
    }
    await Share.share({ title, message });
  } catch {
    // El usuario canceló el diálogo de compartir.
  }
}
