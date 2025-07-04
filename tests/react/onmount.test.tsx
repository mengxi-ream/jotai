import { StrictMode, Suspense, useState } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEventOrig from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

const userEvent = {
  click: (element: Element) => act(() => userEventOrig.click(element)),
}

it('one atom, one effect', async () => {
  const countAtom = atom(1)
  const onMountFn = vi.fn(() => {})
  countAtom.onMount = onMountFn

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  render(
    <>
      <Counter />
    </>,
  )

  expect(await screen.findByText('count: 1')).toBeInTheDocument()
  expect(onMountFn).toHaveBeenCalledTimes(1)

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 2')).toBeInTheDocument()
  expect(onMountFn).toHaveBeenCalledTimes(1)
})

it('two atoms, one each', async () => {
  const countAtom = atom(1)
  const countAtom2 = atom(1)
  const onMountFn = vi.fn(() => {})
  const onMountFn2 = vi.fn(() => {})
  countAtom.onMount = onMountFn
  countAtom2.onMount = onMountFn2

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const [count2, setCount2] = useAtom(countAtom2)
    return (
      <>
        <div>count: {count}</div>
        <div>count2: {count2}</div>
        <button
          onClick={() => {
            setCount((c) => c + 1)
            setCount2((c) => c + 1)
          }}
        >
          button
        </button>
      </>
    )
  }

  render(
    <>
      <Counter />
    </>,
  )

  await waitFor(() => {
    expect(screen.getByText('count: 1')).toBeInTheDocument()
    expect(screen.getByText('count2: 1')).toBeInTheDocument()
  })
  expect(onMountFn).toHaveBeenCalledTimes(1)
  expect(onMountFn2).toHaveBeenCalledTimes(1)

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    expect(screen.getByText('count: 2')).toBeInTheDocument()
    expect(screen.getByText('count2: 2')).toBeInTheDocument()
  })

  expect(onMountFn).toHaveBeenCalledTimes(1)
  expect(onMountFn2).toHaveBeenCalledTimes(1)
})

it('one derived atom, one onMount', async () => {
  const countAtom = atom(1)
  const countAtom2 = atom((get) => get(countAtom))
  const onMountFn = vi.fn(() => {})
  countAtom.onMount = onMountFn

  const Counter = () => {
    const [count] = useAtom(countAtom2)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  render(
    <>
      <Counter />
    </>,
  )

  expect(await screen.findByText('count: 1')).toBeInTheDocument()
  expect(onMountFn).toHaveBeenCalledTimes(1)
})

it('mount/unmount test', async () => {
  const countAtom = atom(1)

  const onUnMountFn = vi.fn()
  const onMountFn = vi.fn(() => onUnMountFn)
  countAtom.onMount = onMountFn

  const Counter = () => {
    const [count] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const Display = () => {
    const [display, setDisplay] = useState(true)
    return (
      <>
        {display ? <Counter /> : null}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  render(
    <>
      <Display />
    </>,
  )

  expect(onMountFn).toHaveBeenCalledTimes(1)
  expect(onUnMountFn).toHaveBeenCalledTimes(0)

  await userEvent.click(screen.getByText('button'))

  expect(onMountFn).toHaveBeenCalledTimes(1)
  expect(onUnMountFn).toHaveBeenCalledTimes(1)
})

it('one derived atom, one onMount for the derived one, and one for the regular atom + onUnMount', async () => {
  const countAtom = atom(1)
  const derivedAtom = atom(
    (get) => get(countAtom),
    (_get, set, update: number) => {
      set(countAtom, update)
      set(derivedAtom, update)
    },
  )
  const onUnMountFn = vi.fn()
  const onMountFn = vi.fn(() => onUnMountFn)
  countAtom.onMount = onMountFn
  const derivedOnUnMountFn = vi.fn()
  const derivedOnMountFn = vi.fn(() => derivedOnUnMountFn)
  derivedAtom.onMount = derivedOnMountFn

  const Counter = () => {
    const [count] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const Display = () => {
    const [display, setDisplay] = useState(true)
    return (
      <>
        {display ? <Counter /> : null}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  render(
    <>
      <Display />
    </>,
  )

  expect(derivedOnMountFn).toHaveBeenCalledTimes(1)
  expect(derivedOnUnMountFn).toHaveBeenCalledTimes(0)
  expect(onMountFn).toHaveBeenCalledTimes(1)
  expect(onUnMountFn).toHaveBeenCalledTimes(0)

  await userEvent.click(screen.getByText('button'))

  expect(derivedOnMountFn).toHaveBeenCalledTimes(1)
  expect(derivedOnUnMountFn).toHaveBeenCalledTimes(1)
  expect(onMountFn).toHaveBeenCalledTimes(1)
  expect(onUnMountFn).toHaveBeenCalledTimes(1)
})

it('mount/unMount order', async () => {
  const committed: number[] = [0, 0]
  const countAtom = atom(1)
  const derivedAtom = atom(
    (get) => get(countAtom),
    (_get, set, update: number) => {
      set(countAtom, update)
      set(derivedAtom, update)
    },
  )
  const onUnMountFn = vi.fn(() => {
    committed[0] = 0
  })
  const onMountFn = vi.fn(() => {
    committed[0] = 1
    return onUnMountFn
  })
  countAtom.onMount = onMountFn
  const derivedOnUnMountFn = vi.fn(() => {
    committed[1] = 0
  })
  const derivedOnMountFn = vi.fn(() => {
    committed[1] = 1
    return derivedOnUnMountFn
  })
  derivedAtom.onMount = derivedOnMountFn

  const Counter2 = () => {
    const [count] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }
  const Counter = () => {
    const [count] = useAtom(countAtom)
    const [display, setDisplay] = useState(false)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setDisplay((c) => !c)}>derived atom</button>
        {display ? <Counter2 /> : null}
      </>
    )
  }

  const Display = () => {
    const [display, setDisplay] = useState(false)
    return (
      <>
        {display ? <Counter /> : null}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Display />
    </StrictMode>,
  )

  expect(committed).toEqual([0, 0])

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    expect(committed).toEqual([1, 0])
  })

  await userEvent.click(screen.getByText('derived atom'))
  await waitFor(() => {
    expect(committed).toEqual([1, 1])
  })

  await userEvent.click(screen.getByText('derived atom'))
  await waitFor(() => {
    expect(committed).toEqual([1, 0])
  })

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    expect(committed).toEqual([0, 0])
  })
})

it('mount/unmount test with async atom', async () => {
  let resolve = () => {}
  const countAtom = atom(
    async () => {
      await new Promise<void>((r) => (resolve = r))
      return 0
    },
    () => {},
  )

  const onUnMountFn = vi.fn()
  const onMountFn = vi.fn(() => onUnMountFn)
  countAtom.onMount = onMountFn

  const Counter = () => {
    const [count] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const Display = () => {
    const [display, setDisplay] = useState(true)
    return (
      <>
        {display ? <Counter /> : null}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  await act(async () => {
    render(
      <>
        <Suspense fallback="loading">
          <Display />
        </Suspense>
      </>,
    )
  })

  expect(await screen.findByText('loading')).toBeInTheDocument()
  resolve()
  await screen.findByText('count: 0')
  expect(onMountFn).toHaveBeenCalledTimes(1)
  expect(onUnMountFn).toHaveBeenCalledTimes(0)

  await userEvent.click(screen.getByText('button'))
  expect(onMountFn).toHaveBeenCalledTimes(1)
  expect(onUnMountFn).toHaveBeenCalledTimes(1)
})

it('subscription usage test', async () => {
  const store = {
    count: 10,
    listeners: new Set<() => void>(),
    inc: () => {
      store.count += 1
      store.listeners.forEach((listener) => listener())
    },
  }

  const countAtom = atom(1)
  countAtom.onMount = (setCount) => {
    const callback = () => {
      setCount(store.count)
    }
    store.listeners.add(callback)
    callback()
    return () => store.listeners.delete(callback)
  }

  const Counter = () => {
    const [count] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
      </>
    )
  }

  const Display = () => {
    const [display, setDisplay] = useState(true)
    return (
      <>
        {display ? <Counter /> : 'N/A'}
        <button onClick={() => setDisplay((c) => !c)}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Display />
    </StrictMode>,
  )

  expect(await screen.findByText('count: 10')).toBeInTheDocument()

  act(() => {
    store.inc()
  })
  expect(await screen.findByText('count: 11')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('N/A')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 11')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('N/A')).toBeInTheDocument()

  act(() => {
    store.inc()
  })
  expect(await screen.findByText('N/A')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 12')).toBeInTheDocument()
})

it('subscription in base atom test', async () => {
  const store = {
    count: 10,
    listeners: new Set<() => void>(),
    add: (n: number) => {
      store.count += n
      store.listeners.forEach((listener) => listener())
    },
  }

  const countAtom = atom(1)
  countAtom.onMount = (setCount) => {
    const callback = () => {
      setCount(store.count)
    }
    store.listeners.add(callback)
    callback()
    return () => store.listeners.delete(callback)
  }
  const derivedAtom = atom(
    (get) => get(countAtom),
    (_get, _set, n: number) => {
      store.add(n)
    },
  )

  const Counter = () => {
    const [count, add] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => add(1)}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(await screen.findByText('count: 10')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 11')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 12')).toBeInTheDocument()
})

it('create atom with onMount in async get', async () => {
  const store = {
    count: 10,
    listeners: new Set<() => void>(),
    add: (n: number) => {
      store.count += n
      store.listeners.forEach((listener) => listener())
    },
  }

  const holderAtom = atom(async () => {
    const countAtom = atom(1)
    countAtom.onMount = (setCount) => {
      const callback = () => {
        setCount(store.count)
      }
      store.listeners.add(callback)
      callback()
      return () => store.listeners.delete(callback)
    }
    return countAtom
  })
  const derivedAtom = atom(
    async (get) => get(await get(holderAtom)),
    (_get, _set, n: number) => {
      store.add(n)
    },
  )

  const Counter = () => {
    const [count, add] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => add(1)}>button</button>
      </>
    )
  }

  await act(async () => {
    render(
      <StrictMode>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </StrictMode>,
    )
  })

  // FIXME this is not working
  //await screen.findByText('count: 1')

  expect(await screen.findByText('count: 10')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 11')).toBeInTheDocument()

  await userEvent.click(screen.getByText('button'))
  expect(await screen.findByText('count: 12')).toBeInTheDocument()
})
