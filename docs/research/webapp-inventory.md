# OA Web App — Volledige Inventarisatie

Datum: 2026-03-08
Status: Input voor redesign

---

## Tabs en Views

De app heeft zeven tabs, geregistreerd in App.tsx: dashboard, builder, templates, context, teams, settings en demo.

### Dashboard Tab

De centrale view. Heeft een driekoloms layout: links een smal sidebar (260px) met SpawnForm, ActivityFeed en GuardianPanel, in het midden een stats-balk met agent-aantallen en een KanbanBoard, rechts een AgentPanel (320px) voor detailweergave.

De KanbanBoard toont agents in drie kolommen: Running, Done en Failed/Other. Elke kaart toont naam, status, model, taak (afgekapt) en duur. Bij klikken wordt de agent geselecteerd en verschijnt het detail in het AgentPanel.

Het AgentPanel heeft drie sub-tabs: Info (task, workspace, max-children, kill-knop), Messages (chatgeschiedenis + invoerveld om berichten te sturen), en Output (live streaming via SSE + copy-knop). Breadcrumb toont parent-keten.

De ActivityFeed toont de laatste 20 statuswijzigingen (spawned, done, failed, cleaned). Maximaal 50 events worden bijgehouden in de store.

De GuardianPanel toont guardians als ze bestaan (anders verborgen). Per guardian: naam, trigger-type, model, laatste-trigger-tijd, en een handmatige Run-knop.

De SpawnForm heeft een template-dropdown (Custom, Researcher, Developer, Reviewer, Analyzer), een taaktekstveld, model-knoppen (haiku/sonnet/opus/ollama), en een Advanced-sectie met optionele naam en parent-keuze. Ctrl+Enter spawnt de agent.

LiveCanvas bestaat als component maar wordt NIET gebruikt in DashboardTab. DashboardTab gebruikt KanbanBoard. LiveCanvas (ReactFlow canvas) is aanwezig in de codebase maar is uitgefaseerd of nooit geactiveerd in de huidige layout.

### Builder Tab

Aanwezig in App.tsx maar de inhoud is niet gelezen in detail. De directorystructuur toont BuilderTab.tsx, FlowCanvas.tsx, NodePalette.tsx en een nodes-submap — suggestie voor een visuele workflow-editor op basis van ReactFlow.

### Templates Tab

Toont een zoekbalk, categorie-filters en een responsief grid van TemplateCards. Templates worden geladen via de store (templateStore). Per template: Use (vult SpawnForm voor), Spawn (spawnt direct en navigeert naar dashboard), Duplicate, Delete. Zoeken op naam, beschrijving of prompt. Categorie-pills dynamisch gebouwd uit de templatedata.

### Context Tab

Aanwezig in App.tsx, bevat ContextTab.tsx en ContextWorkspace.tsx. Niet diepgaand gelezen, maar het type-systeem definieert ContextItem (type: file/snippet/instruction, naam, content, tokens) en Snippet. Suggests een context-beheer voor agent-prompts.

### Teams Tab

Toont een lijst van agent-teams met CRUD-operaties. Aanmaken via formulier bovenin. Per team: naam, leden als badges, knop om lid toe te voegen (inline input), delete-knop, aanmaakdatum. Geen taken-koppeling of team-broadcast zichtbaar in de UI.

### Settings Tab

Aanwezig, bevat ApiKeyManager.tsx en ModelConfig.tsx. Niet diepgaand gelezen, maar Settings-type definieert: defaultModel, maxConcurrentAgents, defaultTimeout, apiKeys (map), ollamaEndpoint, theme.

### Demo Tab

Aanwezig in App.tsx, details onbekend. Waarschijnlijk een demo/onboarding flow.

---

## Gebruikersacties via de UI

Agents: spawnen (met template, model, naam, parent), killen (running agents), opschonen (clean verwijdert niet-running).

Messaging: berichten sturen naar een geselecteerde agent vanuit AgentPanel > Messages-tab.

Guardians: handmatig triggeren via GuardianPanel.

Templates: zoeken, filteren op categorie, gebruiken als SpawnForm-prefill, direct spawnen, dupliceren, verwijderen.

Teams: aanmaken, verwijderen, leden toevoegen.

Navigatie: tab-wisseling via Sidebar. Onboarding-flow bij eerste bezoek.

Output: live bekijken via SSE, kopiëren naar clipboard.

---

## API Calls — Gebruik vs. Aanwezig

Gebruikt in de UI:

fetchAgents — elke 2 seconden polling via agentStore.
fetchAgentDetail — elke 2 seconden in AgentPanel.
spawnAgent — via SpawnForm en TemplatesTab.
killAgent — via AgentPanel.
cleanAgents — via SpawnForm.
startSession — automatisch aangeroepen bij spawnAgent.
fetchMessages — elke 2 seconden in AgentPanel + 3 seconden in LiveCanvas (die niet in use is).
sendMessage — via AgentPanel.
streamAgentOutput — SSE in AgentPanel voor running agents.
fetchGuardians — eenmalig in GuardianPanel.
triggerGuardian — via GuardianPanel.
fetchTemplates — via templateStore.

NIET gebruikt in de UI (aanwezig in client.ts):

broadcastMessage — bestaat in client.ts, nergens in UI aangeroepen. CLI kan broadcasen, UI niet.
markRead — bestaat, maar berichten worden niet als gelezen gemarkeerd vanuit de UI.
pauseAgent — bestaat, geen pause-knop in de UI.
resumeAgent — bestaat, geen resume-knop in de UI.
fetchPipelines — bestaat, geen pipelines-view in de UI.
fetchTeams, createTeam, deleteTeam, addTeamMember — worden gebruikt in TeamsTab, maar addTeamMember ondersteunt geen member-verwijdering (geen removeTeamMember).
fetchTasks, createTask, updateTask — volledig ongebruikt in de UI. Tasks-systeem bestaat in de backend maar is niet zichtbaar.
fetchCheckpoints, resumeFromCheckpoint — volledig ongebruikt. Geen checkpoint-view.
fetchSessionStatus — volledig ongebruikt.

---

## UX Gaps — Wat de CLI kan maar de UI niet

oa pipeline uitvoeren. Geen pipeline-triggering, geen pipeline-status view.

Broadcasts sturen. broadcastMessage bestaat in de API maar heeft geen UI-equivalent.

Agents pauzeren en hervatten. pauseAgent en resumeAgent zijn geïmplementeerd in de backend maar ontbreken volledig in de UI.

Checkpoints bekijken of hervatten. resumeFromCheckpoint is ongebruikt.

Berichten markeren als gelezen. markRead bestaat, wordt niet aangeroepen — unread-badges in LiveCanvas (ongebruikt) tonen wel unread_messages.

Taken beheren per team. Tasks-API is aanwezig maar de UI heeft geen taken-view.

Team-leden verwijderen. addTeamMember bestaat maar removeMember ontbreekt.

Output van completed agents bekijken. Het output-bestand (output_file in Agent-type) wordt niet getoond of gelinkt.

Workspace openen. agent.workspace en project_root zijn zichtbaar in Info-tab, maar niet klikbaar of opnbaar.

Agent-timeout instellen. auto_cleanup_minutes en max_children zijn zichtbaar maar niet instelbaar via UI bij spawnen.

---

## Store Structuur

agentStore (Zustand): agents (array), selectedAgent (string|null), agentDetail (Agent|null), activityLog (max 50), eventIdCounter, prevAgentStatuses, initialLoadDone. Methoden: fetchAgents, fetchDetail, selectAgent, spawnAgent, killAgent, cleanAgents. Computed: getRunning, getDone, getFailed, getHierarchy, getModelDistribution.

templateStore: templates, searchQuery, selectedCategory. Methoden: loadTemplates, setSearchQuery, setCategory, getFiltered, duplicateTemplate, deleteTemplate.

uiStore: activeMainTab, themeId, prefilledTask, prefilledModel. Methoden: setMainTab, setPrefilledTask, clearPrefilled.

contextStore: aanwezig maar niet in detail gelezen.
settingsStore: aanwezig maar niet in detail gelezen.

Er is geen aparte messagesStore. Berichten worden lokaal bijgehouden in AgentPanel-component state, niet centraal. Unread-count leeft op Agent.unread_messages (wordt door backend bijgehouden), maar markRead wordt nooit aangeroepen.

---

## Ontbrekende Functionaliteit per Tab

### Dashboard

Geen live canvas (LiveCanvas bestaat maar is uitgeschakeld — KanbanBoard vervangt het).
Geen broadcast-knop.
Geen pause/resume per agent.
Geen pipeline-weergave of trigger.
Geen checkpoint-overzicht.
Spawn Advanced opties zijn verborgen achter een toggle — max_children en auto_cleanup_minutes zijn niet instelbaar.
Activity Feed is alleen in-memory, reset bij page refresh.
Guardians worden alleen geladen bij mount, niet gepolled.

### AgentPanel

Geen markRead-aanroep — berichten blijven als unread in de backend.
Output tab toont live_output of result maar niet het output_file (het resultaat-bestand op schijf).
Geen manier om berichten te zien tussen twee andere agents (alleen inbox van geselecteerde agent).
Geen history van kills of restarts.
Workspace-pad is niet klikbaar of opnbaar.

### Templates Tab

Geen manier om een nieuw template aan te maken vanuit de UI — alleen via het bestandssysteem.
Geen preview van de volledige systemPrompt.
Geen editeeroptie — alleen duplicate en delete.
Geen zichtbaarheid van nodes/edges in een template (FlowNodeData bestaat in types maar wordt alleen getoond via builder).

### Teams Tab

Geen member-verwijdering.
Geen koppeling aan taken — fetchTasks/createTask/updateTask zijn aanwezig maar niet gebruikt.
Geen team-broadcast vanuit de UI.
Geen zichtbaarheid van welke agents momenteel in een team actief zijn.

### Builder Tab

Onbekend in detail, maar op basis van bestandsstructuur: waarschijnlijk een visuele workflow-editor. Relatie met templates en daadwerkelijk spawnen van agents is onduidelijk zonder dieper te lezen.

### Context Tab

Onbekend in detail. Tokens-veld in ContextItem suggereert een token-budget UI, maar of dit werkelijk werkt en verbonden is aan agent-spawning is onduidelijk.

### Settings Tab

defaultModel in Settings-type heeft geen effect op SpawnForm (die heeft zijn eigen hardcoded defaultmodel).
maxConcurrentAgents en defaultTimeout zijn gedefinieerd in het type maar het is onduidelijk of ze daadwerkelijk worden doorgegeven bij spawnen.

---

## Architecturele Observaties

De app gebruikt twee styling-paradigma's naast elkaar. DashboardTab en zijn componenten gebruiken hoofdzakelijk inline styles met CSS variabelen op lichte achtergrond (#ffffff, #f9fafb). TemplatesTab, TeamsTab en de sidebar gebruiken Tailwind utility-classes met donkere theming (bg-oa-bg, text-oa-text). Dit leidt tot visuele inconsistentie.

LiveCanvas is volledig uitgebouwd (ReactFlow, message-edges, drag-posities, minimap) maar wordt niet gerenderd. DashboardTab toont KanbanBoard in plaats daarvan. Er is dode code van substantiële omvang.

Polling is zwaar: fetchAgents elke 2 seconden, fetchAgentDetail elke 2 seconden, fetchMessages elke 2 seconden in AgentPanel plus elke 3 seconden in LiveCanvas (ook al wordt dat niet gerenderd). Bij veel agents tegelijk is dit een potentieel bottleneck.

startSession wordt automatisch aangeroepen bij elke spawnAgent-call, maar fetchSessionStatus wordt nooit gebruikt. De sessie-lifecycle is niet zichtbaar voor de gebruiker.

Onboarding-flow bestaat (Onboarding.tsx) maar is simpel geboolstyled via localStorage.
