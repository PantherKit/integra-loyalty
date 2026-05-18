import { defineConfig } from 'vitest/config';

// Env mínimos para que los módulos AWS (cognito verifier) se inicialicen
// sin red durante los tests unitarios de los guards de seguridad.
export default defineConfig({
  test: {
    env: {
      COGNITO_USER_POOL_ID: 'us-east-1_test00000',
      COGNITO_CLIENT_ID: 'test0000000000000000000000',
      AWS_REGION_HINT: 'us-east-1',
      TABLE_NAME: 'integra-loyalty-test',
    },
  },
});
