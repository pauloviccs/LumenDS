# LumenDS — Build v0.1.5 (Planejamento)

> **Status**: Em Planejamento
> **Base**: Build v0.1.2 (Estável)
> **Foco**: Funcionalidades de Agendamento, Comandos Remotos e Resiliência.

## Visão Geral da Versão
Enquanto a v0.1.2 focou em estabilidade e correção de custos (Egress), a **v0.1.5** marcará a evolução do LumenDS para um sistema de Digital Signage funcionalmente competitivo. O objetivo é permitir que o usuário controle *quando* o conteúdo é exibido e interaja ativamente com as telas.

## Novas Funcionalidades Planejadas

### 1. Sistema de Agendamento (Scheduling) [IMPORTANTE PRIORIZAR O EGRESS]
**Prioridade: Alta**
Permitir que playlists sejam agendadas por horários ou datas específicas.
- [ ] **Modelagem de Dados**: Criar tabela `schedules` (linked to `screens` and `playlists`).
- [ ] **Lógica do Player**:
    -   Player verifica agendamentos ativos além da playlist padrão.
    -   Lógica de prioridade: Agendamento > Playlist Padrão.
- [ ] **UI do Dashboard**: Interface de calendário ou lista de agendamentos por tela. (Mantendo o mesmo estilo de front-end, da mesma interface do v0.1.2 para não criar confusão com os usuários do dashboard)

### 2. Comandos Remotos (via Realtime)
**Prioridade: Média-Alta**
Enviar comandos instantâneos para as telas sem alterar a playlist.
- [ ] **Reboot/Reload**: Forçar recarregamento da página (útil para atualizar versão do player).
- [ ] **Limpar Cache**: Forçar limpeza de Storage e re-download de assets.
- [ ] **Screenshot (Experimental)**: Solicitar que o player envie uma captura de tela atual (canvas/video) para monitoramento. (Não é uma prioridade alta, mas pode ser útil para debug)

### 3. Otimização de Leitura (Smart Playlist Hashing)
**Prioridade: Alta (Performance)**
Reduzir ainda mais o custo de leitura no Supabase.
- [ ] **Conceito**: O Player só deve baixar a lista de itens da playlist se o `hash` da playlist mudar.
- [ ] **Implementação**:
    -   Adicionar coluna `content_hash` na tabela `playlists`.
    -   Recalcular hash (MD5/SHA) sempre que itens forem editados no Dashboard.
    -   Player compara `localHash` vs `remoteHash` antes de fazer o fetch dos itens.

### 4. Feedback Visual de Conexão [IMPORTANTE]
**Prioridade: Média**
Melhorar a UX do Dashboard para refletir o status real (Online/Offline) com base no novo intervalo de ping (30s).
- [ ] **Indicador "Visto por último"**: Mostrar "Online (há 5s)", "Online (há 28s)", "Offline (há 2min)".
- [ ] **Alertas**: Notificar visualmente se uma tela parar de responder. [Ícone de notificações já existente na UI pode ficar vermelho, com o número de alertas para melhorar a UX]

## Arquitetura e Mudanças Técnicas

### Banco de Dados
```sql
-- Exemplo Prévio da Tabela de Agendamentos
CREATE TABLE schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid REFERENCES screens(id),
  playlist_id uuid REFERENCES playlists(id),
  start_time time NOT NULL,
  end_time time NOT NULL,
  days_of_week int[], -- [0, 1, 2, 3, 4, 5, 6] (Dom-Sab)
  priority int DEFAULT 1
);
```

### Player Logic Update
O loop de verificação do Player (`boot.jsx` e `usePlayerCron`) precisará ser mais inteligente:
1.  **Check 30s**: Ping + Check Hash + Check Schedule.
2.  **Se Schedule Ativo**: Toca Playlist Agendada.
3.  **Se Hash Mudou**: Baixa nova lista de itens.

## Roadmap de Implementação

1.  **Fase 1: Database & Backend**: Criar tabelas e RLS para `schedules`.
2.  **Fase 2: Player Logic**: Implementar lógica de Schedule e Hash no Player (sem UI ainda).
3.  **Fase 3: Dashboard UI**: Criar telas de gerenciamento de agendamento.
4.  **Fase 4: Comandos Remotos**: Implementar listeners de comandos no Player.

## Critérios de Aceite para v0.1.5
- [ ] Player alterna automaticamente entre Playlist Padrão e Agendada baseada no horário.
- [ ] Player não faz fetch de itens de playlist se o conteúdo não mudou (Hash).
- [ ] Dashboard consegue enviar comando de "Reload" para uma tela específica.
- [ ] Manter consumo de Egress controlado (monitoramento contínuo).
