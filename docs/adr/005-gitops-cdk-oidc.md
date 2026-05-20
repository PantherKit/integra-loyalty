# ADR-005: GitOps flow con CDK + OIDC

**Date:** 2026-05-13
**Status:** accepted

## Context

Necesitamos un pipeline de deploy que sea:
- Sin secretos AWS hardcoded en GitHub Actions
- Reproducible (mismo commit → mismo deploy)
- Auditable (cada deploy ligado a un PR)
- Cero downtime

## Decision

**GitOps con GitHub Actions + AWS CDK + OIDC federation.**

### Flow

```
1. PR opened con cambios en api/ o infra/
        ↓
2. GitHub Actions:
   - lint + typecheck + test
   - cdk synth (validate sin deploy)
   - comentario en PR con diff de recursos
        ↓
3. PR review + approval (ruleset)
        ↓
4. Merge to main
        ↓
5. GitHub Actions main branch:
   - cdk deploy IntegraLoyalty-dev (auto, OIDC)
        ↓
6. Smoke tests sobre dev URL
        ↓
7. Tag v0.1.0-rc1 → cdk deploy stage
8. Tag v0.1.0 + manual approval → cdk deploy prod
```

### OIDC federation

GitHub Actions asume role IAM en AWS sin API keys:

```yaml
# .github/workflows/cdk.yml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::041876399045:role/GitHubActions-CDK-Deploy
      aws-region: us-east-1
```

Trust policy del role:
```json
{
  "Federated": "arn:aws:iam::041876399045:oidc-provider/token.actions.githubusercontent.com",
  "Condition": {
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:PantherKit/integra-loyalty:*"
    }
  }
}
```

## Alternatives considered

| Alternativa | Por qué se descartó |
|---|---|
| AWS API keys en GitHub Secrets | Riesgo: rotación manual, si se filtran… |
| CodePipeline + CodeBuild | Más AWS-native pero menos visibilidad/control que GitHub Actions; CodeBuild idle = $0 pero costo igual |
| Terraform | Conocimiento del equipo en CDK; TS end-to-end ya decidido en ADR-001 |
| ArgoCD / Flux | Overkill para una app SaaS; diseñados para K8s |

## Consequences

**Positivas:**
- Cero secretos AWS en GitHub
- Cualquier cambio de infra requiere PR (auditoría)
- Rollback = revertir commit + GitHub Actions auto-deploya el rollback
- Mismo lenguaje TS para infra + app

**Negativas:**
- OIDC setup inicial requiere crear IAM role manualmente (1 vez por account)
- CDK bootstrap es prerequisito (`cdk bootstrap` 1 vez por account/region)
- Si GitHub Actions cae, deploy bloqueado. Mitigable con `cdk deploy` manual desde laptop con perfil AWS dev.

## Plan de implementación

1. **Esta PR:** scaffold `.github/workflows/cdk.yml` con synth (no deploy todavía)
2. **Próximo paso (manual de Jorge):**
   - Crear OIDC provider en account `041876399045`
   - Crear IAM role `GitHubActions-CDK-Deploy` con trust policy + permission para CDK
   - `cdk bootstrap aws://041876399045/us-east-1`
3. **Activar deploy auto:** descomentar steps en workflow
4. **Smoke test:** primer `cdk deploy IntegraLoyalty-dev` manual desde laptop, después CI

## References

- AWS docs OIDC con GitHub: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- aws-actions/configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials
- CDK best practices: https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html
