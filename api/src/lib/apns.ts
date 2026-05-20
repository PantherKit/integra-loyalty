import http2 from 'node:http2';
import { getPassCredentials } from './applePass';
import { listRegistrationsByCard } from './repositories/passRegistration';

// Los pases de Wallet SIEMPRE usan APNs de producción, sin importar el entorno.
const APNS_HOST = 'https://api.push.apple.com';

/**
 * Extrae bloques PEM limpios. Los certs exportados con openssl traen un
 * preámbulo "Bag Attributes ..." antes de -----BEGIN-----; el TLS nativo
 * de Node puede fallar el handshake con eso (sobre todo con key cifrada),
 * produciendo status 0. Nos quedamos solo con los bloques -----BEGIN/END-----.
 */
function cleanPem(pem: string): string {
  const blocks = pem.match(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g);
  return blocks ? blocks.join('\n') + '\n' : pem;
}

/**
 * Notifica a Apple que el pase de una card cambió, para que los devices
 * registrados hagan pull del pase actualizado vía el PassKit Web Service.
 *
 * Best-effort: NUNCA lanza. Loggea el resultado por device. El comercio
 * no debe ver afectada su respuesta (200 del stamp/redeem) por APNs.
 */
export async function notifyPassUpdate(tenantId: string, cardId: string): Promise<void> {
  let regs;
  try {
    regs = await listRegistrationsByCard(tenantId, cardId);
  } catch (err) {
    console.error('apns_list_registrations_failed', { tenantId, cardId, err });
    return;
  }

  if (regs.length === 0) {
    return; // nadie registró el pase aún (PWA-only, o aún no se añadió a Wallet)
  }

  let creds;
  try {
    creds = await getPassCredentials();
  } catch (err) {
    console.error('apns_creds_failed', { tenantId, cardId, err });
    return;
  }

  let session: http2.ClientHttp2Session;
  try {
    session = http2.connect(APNS_HOST, {
      cert: cleanPem(creds.signerCert),
      key: cleanPem(creds.signerKey),
      passphrase: creds.passphrase,
    });
  } catch (err) {
    console.error('apns_connect_failed', { tenantId, cardId, err: String(err) });
    return;
  }

  session.on('error', (err) => {
    console.error('apns_session_error', {
      tenantId,
      cardId,
      msg: (err as Error)?.message,
      code: (err as NodeJS.ErrnoException)?.code,
    });
  });
  session.on('goaway', (errorCode, _lastStreamID, opaqueData) => {
    console.error('apns_goaway', {
      cardId,
      errorCode,
      data: opaqueData?.toString('utf8').slice(0, 200),
    });
  });

  try {
    // Cota dura: el comercio espera este await; si APNs cuelga, no más de 6s.
    const timeout = new Promise<void>((r) => setTimeout(r, 6000));
    await Promise.race([
      Promise.all(
        regs.map((reg) => sendOne(session, reg.pushToken, creds.passTypeId, cardId))
      ),
      timeout,
    ]);
  } finally {
    try {
      session.close();
    } catch {
      /* noop */
    }
  }
}

function sendOne(
  session: http2.ClientHttp2Session,
  pushToken: string,
  passTypeId: string,
  cardId: string
): Promise<void> {
  return new Promise<void>((resolveDone) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolveDone();
    };

    try {
      // PassKit pass update: solo apns-topic (= passTypeId) + payload vacío.
      // Evitamos apns-push-type 'background' (APNs puede resetear el stream
      // -> status 0 sin body, exactamente lo que vimos).
      const req = session.request({
        ':method': 'POST',
        ':path': `/3/device/${pushToken}`,
        'apns-topic': passTypeId,
      });

      let status = 0;
      let bodyChunks = '';

      req.on('response', (headers) => {
        status = Number(headers[':status']) || 0;
      });
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => {
        bodyChunks += chunk;
      });
      req.on('end', () => {
        if (status === 200) {
          console.log('apns_ok', { cardId, token: pushToken.slice(0, 8) });
        } else {
          console.error('apns_non_200', {
            cardId,
            token: pushToken.slice(0, 8),
            status,
            body: bodyChunks.slice(0, 200),
          });
        }
        done();
      });
      req.on('error', (err) => {
        console.error('apns_request_error', {
          cardId,
          token: pushToken.slice(0, 8),
          msg: (err as Error)?.message,
          code: (err as NodeJS.ErrnoException)?.code,
        });
        done();
      });
      req.on('close', () => {
        if (status === 0) {
          console.error('apns_stream_closed_no_response', {
            cardId,
            token: pushToken.slice(0, 8),
            rstCode: req.rstCode,
          });
        }
      });

      // Pase update: body vacío `{}` es lo que Apple espera.
      req.end('{}');
    } catch (err) {
      console.error('apns_send_threw', { cardId, err });
      done();
    }
  });
}
