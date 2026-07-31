import { Panel, PanelGroup } from 'react-resizable-panels'
import { MemoryRouter } from 'react-router-dom'

import { AiAgent } from '~/components/aiAgent/AiAgent'
import { DevtoolsErrorBoundary } from '~/components/developers/DevtoolsErrorBoundary'
import { DEVTOOL_ROUTE } from '~/components/developers/devtoolsRoutes'
import { DevtoolsView } from '~/components/developers/DevtoolsView'
import { RouteWrapper } from '~/components/RouteWrapper'
import '~/core/overlays/registeredDialogs'
import { AiAgentProvider } from '~/hooks/aiAgent/useAiAgent'
import { DeveloperToolProvider, DEVTOOL_AUTO_SAVE_ID } from '~/hooks/useDeveloperTool'
import { QuotePdfProvider } from '~/pages/quotes/common/QuotePdfProvider'

const AuthenticatedShell = () => (
  <AiAgentProvider>
    <DeveloperToolProvider>
      <QuotePdfProvider>
        <PanelGroup direction="vertical" autoSaveId={DEVTOOL_AUTO_SAVE_ID}>
          <Panel id="app-panel-group">
            <PanelGroup direction="horizontal">
              <Panel id="app-panel">
                <div className="h-full overflow-auto" data-app-wrapper>
                  <RouteWrapper />
                </div>
              </Panel>
              <AiAgent />
            </PanelGroup>
          </Panel>
          <MemoryRouter initialEntries={[DEVTOOL_ROUTE]}>
            <DevtoolsErrorBoundary>
              <DevtoolsView />
            </DevtoolsErrorBoundary>
          </MemoryRouter>
        </PanelGroup>
      </QuotePdfProvider>
    </DeveloperToolProvider>
  </AiAgentProvider>
)

export default AuthenticatedShell
