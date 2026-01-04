interface InitialsAvatarProps {
    name: string;
    size?: number;
    className?: string;
}

export default function InitialsAvatar({ name, size = 48, className = '' }: InitialsAvatarProps) {
    // 从名字中提取首字母
    const getInitials = (name: string): string => {
        if (!name) return '?';

        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            // 单个词，取前两个字符
            return name.slice(0, 1).toUpperCase();
        }
        // 多个词，取前两个词的首字母
        return words.slice(0, 1).map(word => word[0]).join('').toUpperCase();
    };

    // 根据名字生成一致的随机颜色
    const getColorFromName = (name: string): string => {
        const colors = [
            '#FF6B6B', // 红色
            '#4ECDC4', // 青色
            '#45B7D1', // 蓝色
            '#FFA07A', // 橙色
            '#98D8C8', // 薄荷绿
            '#F7DC6F', // 黄色
            '#BB8FCE', // 紫色
            '#85C1E2', // 天蓝色
            '#F8B739', // 金色
            '#52B788', // 绿色
            '#E76F51', // 珊瑚色
            '#2A9D8F', // 青绿色
        ];

        // 使用名字的字符码生成一致的索引
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    const initials = getInitials(name);
    const bgColor = getColorFromName(name);
    const fontSize = size > 60 ? size * 0.35 : size * 0.4;

    return (
        <div
            className={`flex items-center justify-center font-semibold text-white ${className}`}
            style={{
                width: size,
                height: size,
                backgroundColor: bgColor,
                fontSize: `${fontSize}px`,
                lineHeight: 1,
            }}
        >
            {initials}
        </div>
    );
}
