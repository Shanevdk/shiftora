import type { ImgHTMLAttributes } from 'react';
import shiftoraMark from '../../images/shiftora-mark.png';
import { cn } from '@/lib/utils';

/**
 * The Shiftora mark: the crimson leaf from the brand badge.
 */
export default function AppLogoIcon({
    className,
    ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src={shiftoraMark}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={cn('object-contain select-none', className)}
            {...props}
        />
    );
}
