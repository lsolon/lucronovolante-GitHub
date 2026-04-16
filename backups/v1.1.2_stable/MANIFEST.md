# Backup Manifest - v1.1.2 Stable
**Data:** 2026-04-15
**Versão:** 1.1.2
**Descrição:** Versão estável com sistema de Ambiente de Teste (Staging), controle de versões Admin, e correção de cache PWA.

## Arquivos Incluídos neste Backup:
- `src/App.tsx`
- `src/index.css`
- `src/types.ts`
- `firestore.rules`
- `firebase-blueprint.json`
- `src/components/SettingsView.tsx`

## Destaques desta Versão:
1. **Modo Beta:** Permite testar alterações visuais (como as fontes amarelas) apenas para o Admin quando `betaVersion != publishedVersion`.
2. **Controle de Cache:** O app detecta mudanças de versão e força a limpeza do cache do Service Worker.
3. **Painel Admin:** Seção em "Custos" para gerenciar versões e manutenção.
4. **Debug Footer:** Rodapé com informações de versão e banco de dados para o Admin.

Para restaurar, basta copiar o conteúdo dos arquivos na pasta `/backups/v1.1.2_stable/` de volta para suas localizações originais.
