import { BackupError, MAX_BACKUP_BYTES } from './backup';

export async function saveJsonFile(
  contents: string,
  filename: string,
  _dialogTitle?: string
): Promise<void> {
  const blob = new Blob([contents], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export interface PickedJsonFile {
  contents: string;
  size: number;
}

export function pickJsonFile(): Promise<PickedJsonFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);

    let settled = false;

    const finish = (value: PickedJsonFile | null, error?: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      input.remove();
      window.removeEventListener('focus', handleWindowFocus);
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    };

    const handleWindowFocus = () => {
      window.setTimeout(() => {
        if (!input.files?.length) {
          finish(null);
        }
      }, 300);
    };

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      try {
        if (file.size > MAX_BACKUP_BYTES) {
          throw new BackupError('tooLarge');
        }
        finish({ contents: await file.text(), size: file.size });
      } catch (error) {
        finish(null, error);
      }
    });
    input.addEventListener('cancel', () => finish(null));
    window.addEventListener('focus', handleWindowFocus, { once: true });
    input.click();
  });
}
