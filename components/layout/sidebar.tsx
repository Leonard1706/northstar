'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Target,
  Sparkles,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentPanel } from '@/lib/agent-context';
import { useState, useEffect } from 'react';

const navItems = [
  {
    href: '/',
    label: 'Today',
    icon: Compass,
    description: 'Your current focus'
  },
  {
    href: '/goals',
    label: 'Goals',
    icon: Target,
    description: 'Track your progress'
  },
  {
    href: '/vision',
    label: 'Vision',
    icon: Sparkles,
    description: 'Your north star'
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen: isAgentOpen, toggle: toggleAgent } = useAgentPanel();
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Check for saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) setCollapsed(JSON.parse(saved));

    // Check dark mode
    const dark = document.documentElement.classList.contains('dark');
    setIsDark(dark);
  }, []);

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  const toggleDark = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'fixed left-0 top-0 z-50 h-screen',
        'bg-sidebar border-r border-sidebar-border',
        'flex flex-col'
      )}
    >
      {/* Logo area */}
      <div className={cn(
        'flex h-16 items-center border-b border-sidebar-border',
        collapsed ? 'justify-center px-3' : 'justify-between px-5'
      )}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-3 group">
            <div className={cn(
              'flex items-center justify-center rounded-xl',
              'bg-gradient-to-br from-primary to-primary/80',
              'shadow-sm transition-transform duration-300',
              'group-hover:scale-105',
              'h-9 w-9'
            )}>
              <Compass className={cn(
                'text-primary-foreground transition-transform duration-500',
                'group-hover:rotate-45',
                'h-4 w-4'
              )} />
            </div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <span className="font-serif text-lg font-medium tracking-tight">
                Northstar
              </span>
            </motion.div>
          </Link>
        )}

        {/* Collapse/Expand toggle - only show on larger screens */}
        <button
          onClick={toggleCollapse}
          className={cn(
            'hidden lg:flex h-8 w-8 items-center justify-center rounded-lg',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-sidebar-accent transition-colors'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn(
        'flex-1 py-4',
        collapsed ? 'px-3' : 'px-3'
      )}>
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center rounded-xl transition-all duration-200',
                  collapsed ? 'h-12 w-12 justify-center' : 'h-12 gap-3 px-3',
                  isActive
                    ? 'text-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className={cn(
                      'absolute inset-0 rounded-xl',
                      'bg-gradient-to-r from-primary to-primary/90',
                      'shadow-sm'
                    )}
                    initial={false}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}

                {/* Icon */}
                <div className="relative z-10 flex items-center justify-center">
                  <Icon className={cn(
                    'h-5 w-5 transition-transform duration-200',
                    !isActive && 'group-hover:scale-110'
                  )} />
                </div>

                {/* Label and description */}
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="relative z-10 flex flex-col min-w-0"
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      {!isActive && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className={cn(
                    'absolute left-full ml-2 px-3 py-2 rounded-lg',
                    'bg-popover text-popover-foreground shadow-lg border border-border',
                    'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
                    'transition-all duration-200 whitespace-nowrap z-50'
                  )}>
                    <span className="text-sm font-medium">{item.label}</span>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                )}
              </Link>
            );
          })}

          {/* Coach button */}
          <button
            onClick={toggleAgent}
            className={cn(
              'group relative flex items-center rounded-xl transition-all duration-200 w-full',
              collapsed ? 'h-12 w-12 justify-center' : 'h-12 gap-3 px-3',
              isAgentOpen
                ? 'text-primary-foreground'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            {isAgentOpen && (
              <motion.div
                layoutId="sidebar-active-bg"
                className={cn(
                  'absolute inset-0 rounded-xl',
                  'bg-gradient-to-r from-primary to-primary/90',
                  'shadow-sm'
                )}
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}

            <div className="relative z-10 flex items-center justify-center">
              <MessageCircle className={cn(
                'h-5 w-5 transition-transform duration-200',
                !isAgentOpen && 'group-hover:scale-110'
              )} />
            </div>

            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="relative z-10 flex flex-col min-w-0"
                >
                  <span className="text-sm font-medium">Coach</span>
                  {!isAgentOpen && (
                    <span className="text-xs text-muted-foreground truncate">
                      Goal alignment
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {collapsed && (
              <div className={cn(
                'absolute left-full ml-2 px-3 py-2 rounded-lg',
                'bg-popover text-popover-foreground shadow-lg border border-border',
                'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
                'transition-all duration-200 whitespace-nowrap z-50'
              )}>
                <span className="text-sm font-medium">Coach</span>
                <p className="text-xs text-muted-foreground">Goal alignment</p>
              </div>
            )}
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className={cn(
        'border-t border-sidebar-border py-4',
        collapsed ? 'px-3' : 'px-3'
      )}>
        {/* Theme toggle */}
        <button
          onClick={toggleDark}
          className={cn(
            'flex items-center rounded-xl transition-all duration-200',
            'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50',
            collapsed ? 'h-12 w-12 justify-center' : 'h-12 w-full gap-3 px-3'
          )}
        >
          {isDark ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-sm font-medium"
              >
                {isDark ? 'Light mode' : 'Dark mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

      </div>
    </motion.aside>
  );
}
