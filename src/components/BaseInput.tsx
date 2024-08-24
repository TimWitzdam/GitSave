type Props = {
  type: string;
  value?: string | number;
  placeholder?: string;
  name?: string;
  label?: string;
  width?: string;
  required?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function BaseInput(props: Props) {
  return (
    <div>
      {props.label && (
        <label htmlFor={props.name} className="text-secondary">
          {props.label}
        </label>
      )}
      <div
        className={`rounded-lg bg-bg-300 border-2 border-border-200 hover:border-border-100 transition-colors focus-within:border-border-100 ${props.label && "mt-2"}`}
      >
        <input
          type={props.type}
          value={props.value}
          placeholder={props.placeholder}
          name={props.name}
          onChange={props.onChange}
          required={props.required}
          className={`w-full bg-transparent outline-none p-3 placeholder:text-secondary placeholder:text-opacity-60 ${props.width && props.width}`}
        />
      </div>
    </div>
  );
}
