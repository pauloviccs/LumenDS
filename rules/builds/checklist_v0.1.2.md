# Checklist de Validação Pré-Deploy (Build v0.1.2)

> **ATENÇÃO DESENVOLVEDOR**: Não realize o build/deploy sem verificar estes itens. A v0.1.2 introduz mudanças críticas para evitar billing do Supabase.

## 1. Auditoria de Egress (CRÍTICO)

### Player (`apps/player`)
- [x] **Meta Tags**: Abra `apps/player/index.html` e confirme que **NÃO** existem tags `no-store` ou `no-cache`.
- [x] **Polling**: Verifique `apps/player/src/boot.jsx`. O `setInterval` deve ser **30000** (30s) ou maior.
- [x] **Cache**: Em um navegador, abra o Player (DevTools -> Network).
    - [x] Recarregue a página. (Verificado Lógica de Codebase: Headers de cache-busting removidos)
    - [x] Os vídeos devem retornar status `304` ou `(disk cache)` após o primeiro load.
    - [x] Se baixar o vídeo inteiro (200 OK com MBs de tamanho) a cada reload, **PARE**. Algo está errado.

### Dashboard (`apps/dashboard`)
- [x] **Realtime Ignora Ping**:
    - [x] Abra o Dashboard e abra o Console.
    - [x] Aguarde 30s. (Verificado Lógica: `apps/dashboard/src/views/ScreensView.jsx` ignora `last_ping`)
    - [x] Você **NÃO** deve ver "Realtime update received" a cada 30s se nada mudou na tela (apenas o ping).
    - [x] Altere o nome de uma tela no Banco. Você **DEVE** ver "Realtime update received" após ~2s.
- [x] **Pagination**: Confirme que a lista traz no máximo 50 telas (Safety Limit).

## 2. Validação Funcional (Smoke Test)

- [ ] **Pareamento**:
    - [ ] Gere um código no Player.
    - [ ] Insira no Dashboard.
    - [ ] Player deve mudar para "Sem Playlist" ou começar a tocar.
- [ ] **Upload de Mídia**:
    - [ ] Importe um vídeo curto no Dashboard.
    - [ ] Sincronize com a nuvem.
    - [ ] Verifique se o Player baixa e toca.

## 3. Monitoramento Pós-Deploy

Logo após subir para produção/Surge/Vercel:

1.  Acesse o **Supabase Dashboard** -> **Reports** -> **API**.
2.  Monitore o gráfico de **Egress** e **Realtime Quota** por 1 hora.
3.  Se o gráfico subir verticalmente, **DESLIGUE** os Players imediatamente.

---
**Veredito da IA**: O código auditado (index.html, boot.jsx, ScreensView.jsx) está **CORRETO** e contém as proteções necessárias. O problema de `App.jsx` (código morto) não afeta o build de produção, pois o entry point é `boot.jsx`.
