import { User } from 'lucide-react';
import { type ComponentProps, type ReactNode, useMemo } from 'react';

const PASTEL_COLORS: string[] = [
    'bg-pink-300',
    'bg-green-300',
    'bg-blue-300',
    'bg-yellow-300',
    'bg-orange-300',
    'bg-purple-300',
    'bg-violet-300',
    'bg-red-300',
];

const getColorFromID = (id: string): string => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }

    // Ensure the hash is always positive
    const positiveHash = Math.abs(hash);

    // Use the hash to select a color from our preset array
    const colorIndex = positiveHash % PASTEL_COLORS.length;
    return PASTEL_COLORS[colorIndex];
};

type Props = {
    userID: string;
    name?: string;
} & ComponentProps<'div'>;
const UserIcon: React.FC<Props> = ({ userID, name, ...props }) => {
    const bgColor = useMemo(() => getColorFromID(userID), [userID]);
    let display: string | ReactNode;
    if (name) {
        display = name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase();
    } else {
        display = <User className="w-2/3 h-2/3 text-white" />;
    }

    return (
        <div
            {...props}
            className={`
                rounded-full w-6 h-6 ${bgColor} flex justify-center items-center
                ${props.className ? props.className : ''}
            `}
        >
            {display}
        </div>
    );
};

export default UserIcon;
