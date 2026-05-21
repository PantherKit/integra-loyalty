import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminInitiateAuthCommand,
  AdminGetUserCommand,
  AuthFlowType,
  MessageActionType,
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const region = process.env.AWS_REGION_HINT ?? process.env.AWS_REGION ?? 'us-east-1';
export const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';
export const CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? '';

export const cognito = new CognitoIdentityProviderClient({ region });

export const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  clientId: CLIENT_ID,
  tokenUse: 'id',
});

export interface CreateCognitoUserParams {
  email: string;
  password: string;
  tenantId: string;
  /**
   * Rol del custom:role. Default 'owner' para preservar el comportamiento
   * legacy del signup de merchants. Para users Integra-side (sales_admin,
   * sales_rep, integra_admin) pasar el rol correspondiente y tenantId =
   * INTEGRA_TENANT_ID.
   */
  role?: string;
}

export interface CreateCognitoUserResult {
  cognitoSub: string;
}

/**
 * Crea user en Cognito y le asigna tenant_id como custom attribute.
 * Auto-confirma (sin email verification para Slice 1).
 */
export async function createCognitoUser(p: CreateCognitoUserParams): Promise<CreateCognitoUserResult> {
  const create = await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: p.email,
      MessageAction: MessageActionType.SUPPRESS, // sin email auto
      UserAttributes: [
        { Name: 'email', Value: p.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:tenantId', Value: p.tenantId },
        { Name: 'custom:role', Value: p.role ?? 'owner' },
      ],
    })
  );

  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: p.email,
      Password: p.password,
      Permanent: true,
    })
  );

  const sub = create.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
  if (!sub) throw new Error('Cognito did not return a sub for new user');

  return { cognitoSub: sub };
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function authenticateUser(email: string, password: string): Promise<AuthTokens> {
  const res = await cognito.send(
    new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    })
  );

  const r = res.AuthenticationResult;
  if (!r?.IdToken || !r.AccessToken || !r.RefreshToken) {
    throw new Error('Cognito did not return all expected tokens');
  }

  return {
    idToken: r.IdToken,
    accessToken: r.AccessToken,
    refreshToken: r.RefreshToken,
    expiresIn: r.ExpiresIn ?? 3600,
  };
}

export interface VerifiedJwt {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
}

export async function verifyIdToken(token: string): Promise<VerifiedJwt> {
  const payload = await jwtVerifier.verify(token);
  return {
    sub: payload.sub,
    email: (payload.email as string) ?? '',
    tenantId: (payload['custom:tenantId'] as string) ?? '',
    // C2/defensa: un token SIN custom:role NO debe heredar privilegios de
    // comercio. Los merchants siempre se crean con custom:role='owner'.
    role: (payload['custom:role'] as string) ?? 'end_customer',
  };
}
