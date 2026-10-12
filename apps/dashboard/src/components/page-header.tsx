import { createContext, type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";

type PageHeaderContextValue = {
  container: HTMLElement | null;
};

type PageHeaderProviderProps = {
  container: HTMLElement | null;
  children: ReactNode;
};

type PageHeaderSlotProps = {
  children: ReactNode;
};

const PageHeaderContext = createContext<PageHeaderContextValue>({
  container: null,
});

export const PageHeaderProvider = ({ container, children }: PageHeaderProviderProps) => {
  return <PageHeaderContext.Provider value={{ container }}>{children}</PageHeaderContext.Provider>;
};

export const PageHeaderSlot = ({ children }: PageHeaderSlotProps) => {
  const { container } = useContext(PageHeaderContext);

  if (!container) {
    return null;
  }

  return createPortal(children, container);
};
