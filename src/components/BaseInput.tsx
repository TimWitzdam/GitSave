type Props = {
  type: string;
  value?: string;
  placeholder?: string;
  name?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function BaseInput(props: Props) {
  return (
    <div className="rounded-lg bg-bg-300 border-2 border-border-200 hover:border-border-100 transition-colors focus-within:border-border-100">
      <input
        type={props.type}
        value={props.value}
        placeholder={props.placeholder}
        name={props.name}
        className="bg-transparent outline-none p-3"
      />
    </div>
  );
}
