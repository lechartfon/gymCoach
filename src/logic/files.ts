import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function shareTextFile(options: {
  fileName: string;
  content: string;
  mimeType: string;
  dialogTitle: string;
}): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Compartir archivos no está disponible en este dispositivo.');
  }

  const file = new File(Paths.cache, options.fileName);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(options.content);

  await Sharing.shareAsync(file.uri, {
    mimeType: options.mimeType,
    dialogTitle: options.dialogTitle,
  });
}

export async function pickJsonFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const file = new File(result.assets[0].uri);
  return await file.text();
}
