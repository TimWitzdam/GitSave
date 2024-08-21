type Props = {
  children: React.ReactNode;
};

export default function BaseButton(props: Props) {
  return (
    <button className="px-4 py-3 bg-bg-200 rounded-lg border-2 border-transparent hover:border-border-100 transition-colors">
      {props.children}
    </button>
  );
}
