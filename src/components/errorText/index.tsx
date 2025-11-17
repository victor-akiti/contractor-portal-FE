import styles from "./styles/styles.module.css";

/**
 * Error Text Component - Tailwind Enhanced + Mobile Responsive
 * 
 * Features:
 * - Maintains original SCSS styles for backward compatibility
 * - Adds Tailwind classes for enhanced responsiveness
 * - Mobile-friendly sizing and spacing
 * - Accessible error display
 */

interface ErrorTextProps {
    text: string;
    className?: string;
}

const ErrorText = ({ text, className = "" }: ErrorTextProps) => {
    return (
        <div
            className={`
                ${styles.errorText} 
                ${className}
                bg-red-500 text-white 
                px-3 py-2 sm:px-4 sm:py-2.5 
                rounded-md 
                text-xs sm:text-sm md:text-base
                font-medium
                shadow-sm
                animate-fadeIn
                flex items-start space-x-2
            `}
            role="alert"
            aria-live="polite"
        >
            {/* Error Icon - Responsive */}
            <svg
                className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
            >
                <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                />
            </svg>

            {/* Error Text */}
            <span className="flex-1 break-words">
                {text}
            </span>
        </div>
    )
}

export default ErrorText