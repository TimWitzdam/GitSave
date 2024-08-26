type Props = {
  size?: number;
};

export default function TimeIcon({ size = 14 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_9_38)">
        <path
          d="M1.75781 1.75781L0.960938 0.960938C0.607031 0.607031 0 0.857813 0 1.35703V3.9375C0 4.24922 0.250781 4.5 0.5625 4.5H3.14297C3.64453 4.5 3.89531 3.89297 3.54141 3.53906L2.81953 2.81719C3.63281 2.00391 4.75781 1.5 6 1.5C8.48438 1.5 10.5 3.51562 10.5 6C10.5 8.48438 8.48438 10.5 6 10.5C5.04375 10.5 4.15781 10.2023 3.42891 9.69375C3.08906 9.45703 2.62266 9.53906 2.38359 9.87891C2.14453 10.2188 2.22891 10.6852 2.56875 10.9242C3.54375 11.6016 4.72734 12 6 12C9.31406 12 12 9.31406 12 6C12 2.68594 9.31406 0 6 0C4.34297 0 2.84297 0.672656 1.75781 1.75781ZM6 3C5.68828 3 5.4375 3.25078 5.4375 3.5625V6C5.4375 6.15 5.49609 6.29297 5.60156 6.39844L7.28906 8.08594C7.50937 8.30625 7.86562 8.30625 8.08359 8.08594C8.30156 7.86563 8.30391 7.50938 8.08359 7.29141L6.56016 5.76797V3.5625C6.56016 3.25078 6.30937 3 5.99766 3H6Z"
          fill="#969699"
        ></path>
      </g>
      <defs>
        <clipPath id="clip0_9_38">
          <rect width="12" height="12" fill="white"></rect>
        </clipPath>
      </defs>
    </svg>
  );
}
