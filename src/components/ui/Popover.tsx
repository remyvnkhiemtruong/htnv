import React, { cloneElement, isValidElement, useState, useRef, useEffect, useId } from 'react';
import { cn } from '../../utils/cn';

export interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  content,
  align = 'left',
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const contentId = useId();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const triggerElement = isValidElement<React.ButtonHTMLAttributes<HTMLButtonElement>>(trigger)
    ? cloneElement(trigger, {
        type: trigger.props.type || 'button',
        'aria-expanded': isOpen,
        'aria-controls': isOpen ? contentId : undefined,
        'aria-haspopup': 'dialog',
        onClick: event => {
          trigger.props.onClick?.(event);
          if (!event.defaultPrevented) setIsOpen(value => !value);
        }
      })
    : (
      <button type="button" aria-expanded={isOpen} aria-controls={isOpen ? contentId : undefined} aria-haspopup="dialog" onClick={() => setIsOpen(value => !value)}>
        {trigger}
      </button>
    );

  return (
    <div ref={popoverRef} className="relative inline-block">
      {triggerElement}

      {isOpen && (
        <div
          id={contentId}
          role="dialog"
          className={cn(
            "absolute z-50 mt-2 rounded-xl bg-white border border-slate-200 shadow-elevated p-4 animate-fade-in",
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
