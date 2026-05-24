import { AppAttest } from '@capgo/capacitor-app-attest';

const output = document.getElementById('output');
const keyIdInput = document.getElementById('keyId');
const challengeInput = document.getElementById('challenge');
const payloadInput = document.getElementById('payload');
const cloudProjectNumberInput = document.getElementById('cloudProjectNumber');
const hashSaltInput = document.getElementById('hashSalt');
const includeRawIdInput = document.getElementById('includeRawId');

const getCloudProjectNumber = () => {
  const value = cloudProjectNumberInput?.value?.trim();
  return value ? value : undefined;
};

const print = (title, value) => {
  output.textContent = JSON.stringify({ title, value }, null, 2);
};

const printError = (title, error) => {
  const message = error instanceof Error ? error.message : String(error);
  output.textContent = JSON.stringify({ title, error: message }, null, 2);
};

const requireKeyId = () => {
  const keyId = keyIdInput.value.trim();
  if (!keyId) {
    throw new Error('Generate a key first or type a keyId.');
  }
  return keyId;
};

document.getElementById('isSupported')?.addEventListener('click', async () => {
  try {
    const response = await AppAttest.isSupported();
    print('isSupported', response);
  } catch (error) {
    printError('isSupported', error);
  }
});

document.getElementById('getCapabilities')?.addEventListener('click', async () => {
  try {
    const response = await AppAttest.getCapabilities();
    print('getCapabilities', response);
  } catch (error) {
    printError('getCapabilities', error);
  }
});

document.getElementById('prepare')?.addEventListener('click', async () => {
  try {
    const response = await AppAttest.prepare({
      cloudProjectNumber: getCloudProjectNumber(),
    });
    keyIdInput.value = response.keyId;
    print('prepare', response);
  } catch (error) {
    printError('prepare', error);
  }
});

document.getElementById('createAttestation')?.addEventListener('click', async () => {
  try {
    const response = await AppAttest.createAttestation({
      keyId: requireKeyId(),
      challenge: challengeInput.value,
      cloudProjectNumber: getCloudProjectNumber(),
    });
    print('createAttestation', response);
  } catch (error) {
    printError('createAttestation', error);
  }
});

document.getElementById('createAssertion')?.addEventListener('click', async () => {
  try {
    const response = await AppAttest.createAssertion({
      keyId: requireKeyId(),
      payload: payloadInput.value,
      cloudProjectNumber: getCloudProjectNumber(),
    });
    print('createAssertion', response);
  } catch (error) {
    printError('createAssertion', error);
  }
});

document.getElementById('getWidevineFingerprint')?.addEventListener('click', async () => {
  try {
    const hashSalt = hashSaltInput?.value?.trim();
    const response = await AppAttest.getWidevineFingerprint({
      hashSalt: hashSalt || undefined,
      includeRawId: Boolean(includeRawIdInput?.checked),
    });
    print('getWidevineFingerprint', response);
  } catch (error) {
    printError('getWidevineFingerprint', error);
  }
});

document.getElementById('getDeviceCheckToken')?.addEventListener('click', async () => {
  try {
    const response = await AppAttest.getDeviceCheckToken();
    print('getDeviceCheckToken', response);
  } catch (error) {
    printError('getDeviceCheckToken', error);
  }
});

document.getElementById('storeKey')?.addEventListener('click', async () => {
  try {
    const response = await AppAttest.storeKeyId({
      keyId: requireKeyId(),
    });
    print('storeKeyId', response);
  } catch (error) {
    printError('storeKeyId', error);
  }
});

document.getElementById('getStoredKey')?.addEventListener('click', async () => {
  try {
    const response = await AppAttest.getStoredKeyId();
    if (response.keyId) {
      keyIdInput.value = response.keyId;
    }
    print('getStoredKeyId', response);
  } catch (error) {
    printError('getStoredKeyId', error);
  }
});

document.getElementById('clearStoredKey')?.addEventListener('click', async () => {
  try {
    const response = await AppAttest.clearStoredKeyId();
    print('clearStoredKeyId', response);
  } catch (error) {
    printError('clearStoredKeyId', error);
  }
});
