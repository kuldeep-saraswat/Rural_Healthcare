import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'

/**
 * Every outward-facing action in this prototype (phone call, SMS, map
 * directions, video room) is simulated. Rather than silently doing nothing,
 * each one opens this dialog and says exactly what would happen in a real
 * deployment - so nobody can mistake the demo for a working integration.
 */

interface DemoActionApi {
  call: (label: string, phone: string) => void
  message: (label: string, phone: string) => void
  directions: (label: string, address?: string) => void
  custom: (title: string, body: ReactNode, realWorld?: string) => void
}

const DemoActionContext = createContext<DemoActionApi>({
  call: () => undefined,
  message: () => undefined,
  directions: () => undefined,
  custom: () => undefined,
})

export function useDemoAction(): DemoActionApi {
  return useContext(DemoActionContext)
}

interface DialogState {
  title: string
  body: ReactNode
  realWorld?: string
}

export function DemoActionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null)

  const call = useCallback((label: string, phone: string) => {
    setState({
      title: `Demo call: ${label}`,
      body: (
        <p>
          In a real deployment this would dial <strong>{phone}</strong> from the patient&apos;s
          phone. No call is placed in this prototype.
        </p>
      ),
      realWorld: 'Real-world integration: device dialler (tel: link) or a telephony gateway.',
    })
  }, [])

  const message = useCallback((label: string, phone: string) => {
    setState({
      title: `Demo message: ${label}`,
      body: (
        <p>
          In a real deployment an SMS or IVR voice message would be sent to{' '}
          <strong>{phone}</strong>. Nothing is sent in this prototype.
        </p>
      ),
      realWorld: 'Real-world integration: SMS gateway with a local-language template.',
    })
  }, [])

  const directions = useCallback((label: string, address?: string) => {
    setState({
      title: `Demo directions: ${label}`,
      body: (
        <div>
          <p>
            In a real deployment this would open turn-by-turn directions to the facility.
            {address ? (
              <>
                {' '}
                Address on record: <strong>{address}</strong>
              </>
            ) : null}
          </p>
        </div>
      ),
      realWorld: 'Real-world integration: a maps deep link with the facility coordinates.',
    })
  }, [])

  const custom = useCallback((title: string, body: ReactNode, realWorld?: string) => {
    setState({ title, body, realWorld })
  }, [])

  const api = useMemo(() => ({ call, message, directions, custom }), [call, message, directions, custom])

  return (
    <DemoActionContext.Provider value={api}>
      {children}
      <Dialog
        open={state !== null}
        onClose={() => {
          setState(null)
        }}
        title={state?.title ?? ''}
        width="sm"
        footer={
          <Button
            tone="primary"
            onClick={() => {
              setState(null)
            }}
          >
            Close
          </Button>
        }
      >
        <div className="space-y-3 text-[15px] text-ink-900">
          {state?.body}
          <Callout tone="neutral" title="Prototype only" icon="🧪">
            {state?.realWorld ?? 'This action is simulated for the demo.'}
          </Callout>
        </div>
      </Dialog>
    </DemoActionContext.Provider>
  )
}
