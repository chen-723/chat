'use client';

type Props = {
    activeMenu: string;
    setActiveMenu: (menu: string) => void;
    totalUnread?: number;
};


export default function Foot({ activeMenu, setActiveMenu, totalUnread = 0 }: Props) {

    const Contacts = '联系人', Chats = '聊天', Search = '搜索', User = '用户';

    return (
        <div>
            {['聊天', '联系人', '搜索', '用户'].includes(activeMenu) &&
                <div className="absolute bottom-4 w-full text-center py-3.5 grid grid-cols-4 gap-4 border-t border-gray-200 pb-4 ">
                    <div onClick={() => setActiveMenu(Chats)}
                        className={`content-center cursor-pointer hover:text-blue-400 mt-2 relative
                     ${activeMenu === Chats ? 'text-blue-500 hover:text-blue-500' : 'text-gray-400 hover:text-blue-400'}`}>
                        <svg
                            className={`w-5 h-5 flex justify-center items-center mx-auto mb-1`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M18,0C18,0,2,0,2,0C0.89999998,0,0.0099999905,0.89999998,0.0099999905,2C0.0099999905,2,0,20,0,20C0,20,4,16,4,16C4,16,18,16,18,16C19.1,16,20,15.1,20,14C20,14,20,2,20,2C20,0.89999998,19.1,0,18,0C18,0,18,0,18,0ZM4,7C4,7,16,7,16,7C16,7,16,9,16,9C16,9,4,9,4,9C4,9,4,7,4,7C4,7,4,7,4,7ZM12,12C12,12,4,12,4,12C4,12,4,10,4,10C4,10,12,10,12,10C12,10,12,12,12,12C12,12,12,12,12,12ZM16,6C16,6,4,6,4,6C4,6,4,4,4,4C4,4,16,4,16,4C16,4,16,6,16,6C16,6,16,6,16,6Z"
                                fill={`${activeMenu === Chats ? '#002DE3' : '#ADB5BD'}`}
                            />
                        </svg>
                        {totalUnread > 0 && (
                            <span className="absolute -top-2.5 right-4.5 bg-red-500 text-white text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 z-10">
                                {totalUnread > 99 ? '99+' : totalUnread}
                            </span>
                        )}
                        <div>
                            聊天
                        </div>
                    </div>
                    <div onClick={() => setActiveMenu(Contacts)}
                        className={`content-center cursor-pointer hover:text-blue-400 mt-2
                     ${activeMenu === Contacts ? 'text-blue-500 hover:text-blue-500' : 'text-gray-400 hover:text-blue-400'}`}>
                        <svg
                            className={`w-5 h-5 flex justify-center items-center mx-auto mb-1`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M14.5,7C15.88,7,16.99,5.8800001,16.99,4.5C16.99,3.1199999,15.88,2,14.5,2C13.12,2,12,3.1199999,12,4.5C12,5.8800001,13.12,7,14.5,7C14.5,7,14.5,7,14.5,7ZM7,6C8.6599998,6,9.9899998,4.6599998,9.9899998,3C9.9899998,1.34,8.6599998,0,7,0C5.3400002,0,4,1.34,4,3C4,4.6599998,5.3400002,6,7,6C7,6,7,6,7,6ZM14.5,9C12.67,9,9,9.9200001,9,11.75C9,11.75,9,14,9,14C9,14,20,14,20,14C20,14,20,11.75,20,11.75C20,9.9200001,16.33,9,14.5,9C14.5,9,14.5,9,14.5,9ZM7,8C4.6700001,8,0,9.1700001,0,11.5C0,11.5,0,14,0,14C0,14,7,14,7,14C7,14,7,11.75,7,11.75C7,10.9,7.3299999,9.4099998,9.3699999,8.2799997C8.5,8.1000004,7.6599998,8,7,8C7,8,7,8,7,8Z"
                                fill={`${activeMenu === Contacts ? '#002DE3' : '#ADB5BD'}`}
                            />
                        </svg>
                        <div>
                            联系人
                        </div>
                    </div>
                    <div onClick={() => setActiveMenu(Search)}
                        className={`content-center cursor-pointer hover:text-blue-400 mt-2
                     ${activeMenu === Search ? 'text-blue-500 hover:text-blue-500' : 'text-gray-400 hover:text-blue-400'}`}>
                        <svg
                            className={`w-5 h-5 flex justify-center items-center mx-auto mb-1`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M12.5,11C12.5,11,11.71,11,11.71,11C11.71,11,11.43,10.73,11.43,10.73C12.41,9.5900002,13,8.1099997,13,6.5C13,2.9100001,10.09,0,6.5,0C2.9100001,0,0,2.9100001,0,6.5C0,10.09,2.9100001,13,6.5,13C8.1099997,13,9.5900002,12.41,10.73,11.43C10.73,11.43,11,11.71,11,11.71C11,11.71,11,12.5,11,12.5C11,12.5,16,17.49,16,17.49C16,17.49,17.49,16,17.49,16C17.49,16,12.5,11,12.5,11C12.5,11,12.5,11,12.5,11ZM6.5,11C4.0100002,11,2,8.9899998,2,6.5C2,4.0100002,4.0100002,2,6.5,2C8.9899998,2,11,4.0100002,11,6.5C11,8.9899998,8.9899998,11,6.5,11C6.5,11,6.5,11,6.5,11Z"
                                fill={`${activeMenu === Search ? '#002DE3' : '#ADB5BD'}`}
                            />
                        </svg>
                        <div>
                            搜索
                        </div>
                    </div>
                    <div onClick={() => setActiveMenu(User)}
                        className={`content-center cursor-pointer hover:text-blue-400 mt-2
                     ${activeMenu === User ? 'text-blue-500 hover:text-blue-500' : 'text-gray-400 hover:text-blue-400'}`}>
                        <svg
                            className={`w-5 h-5 flex justify-center items-center mx-auto mb-1`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M0,2C0,2,0,16,0,16C0,17.1,0.88999999,18,2,18C2,18,16,18,16,18C17.1,18,18,17.1,18,16C18,16,18,2,18,2C18,0.89999998,17.1,0,16,0C16,0,2,0,2,0C0.88999999,0,0,0.89999998,0,2C0,2,0,2,0,2ZM12,6C12,7.6599998,10.66,9,9,9C7.3400002,9,6,7.6599998,6,6C6,4.3400002,7.3400002,3,9,3C10.66,3,12,4.3400002,12,6C12,6,12,6,12,6ZM3,14C3,12,7,10.9,9,10.9C11,10.9,15,12,15,14C15,14,15,15,15,15C15,15,3,15,3,15C3,15,3,14,3,14C3,14,3,14,3,14Z"
                                fill={`${activeMenu === User ? '#002DE3' : '#ADB5BD'}`}
                            />
                        </svg>
                        <div>
                            用户
                        </div>
                    </div>
                </div>}
        </div>

    )
}