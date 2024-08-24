type Props = {
  size?: number;
};

export default function GitIcon({ size = 28 }: Props) {
  return (
    <svg
      width={size}
      height={size + 4}
      viewBox="0 0 28 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clip-path="url(#clip0_6_499)">
        <path
          d="M27.475 14.7562L15.25 2.53123C14.9114 2.19384 14.4529 2.00439 13.975 2.00439C13.497 2.00439 13.0385 2.19384 12.7 2.53123L10.1562 5.06873L13.375 8.28748C15.0687 7.71873 16.6687 9.33748 16.0875 11.0187L19.1937 14.125C21.3312 13.3875 23.0187 16.0625 21.4125 17.6687C19.7562 19.325 17.025 17.4875 17.9125 15.3375L15.0125 12.4375V20.0562C16.5937 20.8375 16.4062 22.675 15.5812 23.4937C15.3821 23.6937 15.1454 23.8523 14.8847 23.9605C14.6241 24.0688 14.3447 24.1245 14.0625 24.1245C13.7803 24.1245 13.5008 24.0688 13.2402 23.9605C12.9796 23.8523 12.7429 23.6937 12.5437 23.4937C11.4437 22.3937 11.85 20.5625 13.25 19.9937V12.3062C11.95 11.775 11.7125 10.3875 12.0875 9.49372L8.91248 6.31248L0.531225 14.6937C0.193838 15.0323 0.00439453 15.4908 0.00439453 15.9687C0.00439453 16.4467 0.193838 16.9052 0.531225 17.2437L12.7562 29.4687C13.0948 29.8061 13.5533 29.9956 14.0312 29.9956C14.5092 29.9956 14.9677 29.8061 15.3062 29.4687L27.475 17.3C27.8124 16.9614 28.0018 16.5029 28.0018 16.025C28.0018 15.547 27.8124 15.0885 27.475 14.75V14.7562Z"
          fill="white"
        ></path>
      </g>
      <defs>
        <clipPath id="clip0_6_499">
          <rect width="28" height="32" fill="white"></rect>
        </clipPath>
      </defs>
    </svg>
  );
}
