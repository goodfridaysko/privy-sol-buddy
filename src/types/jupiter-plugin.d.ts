declare global {
  interface Window {
    Jupiter: JupiterPlugin;
  }
}

export type WidgetPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
export type WidgetSize = 'sm' | 'default';
export type SwapMode = "ExactInOrOut" | "ExactIn" | "ExactOut";
export type DEFAULT_EXPLORER = 'Solana Explorer' | 'Solscan' | 'Solana Beach' | 'SolanaFM';

export interface FormProps {
  swapMode?: SwapMode;
  initialAmount?: string;
  initialInputMint?: string;
  initialOutputMint?: string;
  fixedAmount?: boolean;
  fixedInputMint?: boolean;
  fixedOutputMint?: boolean;
  referralAccount?: string;
  referralFee?: number;
}

export interface IInit {
  displayMode?: 'modal' | 'integrated' | 'widget';
  integratedTargetId?: string;
  widgetStyle?: {
    position?: WidgetPosition;
    size?: WidgetSize;
  };
  endpoint?: string;
  formProps?: FormProps;
  defaultExplorer?: DEFAULT_EXPLORER;
  containerStyles?: React.CSSProperties;
  containerClassName?: string;
  enableWalletPassthrough?: boolean;
  passthroughWalletContextState?: any;
  onRequestConnectWallet?: () => void | Promise<void>;
  onSuccess?: (props: {
    txid: string;
    swapResult: any;
    quoteResponseMeta: any;
  }) => void;
  onSwapError?: (props: {
    error?: any;
    quoteResponseMeta: any;
  }) => void;
}

export interface JupiterPlugin {
  init: (props: IInit) => void;
  resume: () => void;
  close: () => void;
  syncProps: (props: { passthroughWalletContextState?: any }) => void;
}

export {};
