import React from "react";
import { Link } from "react-router-dom";

const BASE_CLASSES =
  "transition hover:text-[color:rgb(var(--color-accent-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--color-accent-primary),0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-md";

export default function WorkoutLink({ workoutId, children, className = "", stopPropagation = false, onClick, ...rest }) {
  if (children === null || typeof children === "undefined") {
    return null;
  }

  if (!workoutId) {
    return (
      <span className={className} {...rest}>
        {children}
      </span>
    );
  }

  const handleClick = (event) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <Link
      to={`/treinos/${workoutId}`}
      className={`${BASE_CLASSES} ${className}`.trim()}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Link>
  );
}
