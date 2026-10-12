import { Alert, AlertDescription } from "@/components/ui/alert";

const LOGIN_REASON_CONFIG = {
  pending: {
    message: "Your signup was successful. You'll be able to sign in once a platform admin approves your account.",
    variant: "default",
  },
  inactive: {
    message: "Your account is deactivated. Contact your administrator if you think this is a mistake.",
    variant: "destructive",
  },
} as const;

type LoginReason = keyof typeof LOGIN_REASON_CONFIG;

function isLoginReason(value: string | null): value is LoginReason {
  return value !== null && value in LOGIN_REASON_CONFIG;
}

export function LoginReasonBanner(params: { reason: string | null }) {
  const { reason } = params;

  if (!isLoginReason(reason)) {
    return null;
  }

  const { message, variant } = LOGIN_REASON_CONFIG[reason];

  return (
    <Alert variant={variant}>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
