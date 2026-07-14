import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { BackupError, MAX_BACKUP_BYTES } from './backup';

export async function saveJsonFile(
  contents: string,
  filename: string,
  dialogTitle?: string
): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true, intermediates: true });
  file.write(contents);

  if (!(await Sharing.isAvailableAsync())) {
    throw new BackupError('fileSharingUnavailable');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle,
  });
}

export interface PickedJsonFile {
  contents: string;
  size: number;
}

export async function pickJsonFile(): Promise<PickedJsonFile | null> {
  const result = await File.pickFileAsync({ mimeTypes: '*/*' });
  if (result.canceled) {
    return null;
  }
  if (result.result.size > MAX_BACKUP_BYTES) {
    throw new BackupError('tooLarge');
  }
  return {
    contents: await result.result.text(),
    size: result.result.size,
  };
}
