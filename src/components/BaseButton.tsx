type Props = {
  type?: "primary" | "secondary";
  buttonType?: "button" | "submit" | "reset";
  children: React.ReactNode;
  id?: string;
  fullWidth?: boolean;
  onClick?: () => void;
};

export default function BaseButton({
  type = "primary",
  buttonType = "button",
  children,
  id,
  fullWidth,
  onClick,
}: Props) {
  const buttonStyles = {
    primary: "bg-bg-300 border-transparent hover:border-border-100",
    secondary: "bg-transparent border-border-200 hover:border-border-100",
  };

  return (
    <button
      id={id}
      onClick={onClick}
      type={buttonType}
      className={`px-5 py-3 rounded-lg border-2 transition-colors ${buttonStyles[type]} ${fullWidth ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
}
