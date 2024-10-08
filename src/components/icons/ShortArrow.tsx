type Props = {
  size?: number;
};

export default function ShortArrow({ size = 8 }: Props) {
  return (
    <svg
      width={size}
      height={size + 5}
      viewBox="0 0 8 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.03033 7.03033C7.32322 6.73744 7.32322 6.26256 7.03033 5.96967L2.25736 1.1967C1.96447 0.903806 1.48959 0.903806 1.1967 1.1967C0.903806 1.48959 0.903806 1.96447 1.1967 2.25736L5.43934 6.5L1.1967 10.7426C0.903806 11.0355 0.903806 11.5104 1.1967 11.8033C1.48959 12.0962 1.96447 12.0962 2.25736 11.8033L7.03033 7.03033ZM5.5 7.25H6.5V5.75H5.5V7.25Z"
        fill="white"
      />
    </svg>
  );
}
