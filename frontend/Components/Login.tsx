'use client';
import { LockOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { loginUser, registerUser } from "@/utils/api/auth";

type LoginProps = {
    setShowLogin: (value: boolean) => void;
    ShowLogin: boolean;
    setTotalUnread: (value: number) => void;
};

export default function Login({ setShowLogin, ShowLogin, setTotalUnread }: LoginProps) {

    const [ShowRegister, setShowRegister] = useState<boolean>(false);

    const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
    const [regForm, setRegForm] = useState({ username: '', password: '', phone: '' });

    const handleLogin = async () => {
        try {
            // 自动判断是手机号还是用户名（手机号是11位数字）
            const isPhone = /^1[3-9]\d{9}$/.test(loginForm.identifier);
            const { access_token } = await loginUser(
                loginForm.identifier,
                loginForm.password,
                isPhone
            );
            localStorage.setItem("token", access_token); // 存 token

            // 立即建立 WebSocket 连接
            const { wsClient } = await import('@/utils/websocket');
            wsClient.connect(access_token);

            // 加载未读数
            const { allunread } = await import('@/utils/api/messages');
            const unreadData = await allunread(access_token);
            setTotalUnread(unreadData.total || 0);

            // alert("登录成功！");
            setShowLogin(true);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleRegister = async () => {
        try {
            await registerUser(regForm.username, regForm.password, regForm.phone);
            alert("注册成功，即将自动登录…");

            const identifier = regForm.phone ?? regForm.username;
            const isPhone = /^1[3-9]\d{9}$/.test(identifier);
            const { access_token } = await loginUser(identifier, regForm.password, isPhone);
            localStorage.setItem('token', access_token);

            // 立即建立 WebSocket 连接
            const { wsClient } = await import('@/utils/websocket');
            wsClient.connect(access_token);

            // 加载未读数
            const { allunread } = await import('@/utils/api/messages');
            const unreadData = await allunread(access_token);
            setTotalUnread(unreadData.total || 0);

            alert('登录成功！');
            setShowLogin(true);

        } catch (e: any) {
            alert(e.message)
        } finally {
            setRegForm({ username: '', password: '', phone: '' });
            setShowRegister(false);
        }

    }

    //回车确认监听
    useEffect(() => {
        // 只有弹窗出现时才绑定（ShowLogin为false表示未登录，显示登录框）
        if (ShowLogin) return;

        const handleEnter = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            if (ShowRegister) {
                handleRegister();
            } else {
                handleLogin();
            }
        };

        window.addEventListener('keydown', handleEnter);
        return () => window.removeEventListener('keydown', handleEnter);
    }, [ShowLogin, ShowRegister, loginForm, regForm]);

    if (ShowLogin) return null;

    return (
        <div>
            {/* 登录页面 */}
            {!ShowRegister &&
                <div className="">
                    <div className="text-blue-500 flex justify-center relative mt-18 cursor-pointer"
                    // onClick={() => setShowLogin(true)}
                    >
                        请登录
                    </div>
                    <div className="flex justify-center mt-22 text-2xl">
                        这里应该是一个Logo
                    </div>
                    <div className="mt-10 mx-auto w-70">
                        <div className="flex flex-col space-y-6 relative">
                            <div>
                                <UserOutlined className='absolute left-2.5 top-3.5' />
                                <input className="w-full border-gray-200 text-sm py-3 rounded-md pl-8 ring-gray-200 focus:ring-2 focus:outline-none bg-gray-100"
                                    placeholder="用户名 / 手机号"
                                    value={loginForm.identifier}
                                    onChange={(e) =>
                                        setLoginForm({ ...loginForm, identifier: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <LockOutlined className='absolute left-2.5 top-20.5' />
                                <input className="w-full border-gray-200 text-sm py-3 rounded-md pl-8 ring-gray-200 focus:ring-2 focus:outline-none bg-gray-100"
                                    placeholder="PassWord"
                                    type='password'
                                    value={loginForm.password}
                                    onChange={(e) =>
                                        setLoginForm({ ...loginForm, password: e.target.value })
                                    }
                                />
                            </div>
                            <div className="flex flex-row gap-34 ml-4 -mt-3">
                                <div className="text-sm text-blue-400 cursor-pointer"
                                    onClick={() => {
                                        setShowRegister(true)
                                        setRegForm({ username: '', password: '', phone: '' });
                                    }}>
                                    立即注册
                                </div>
                                <div className="text-sm text-blue-400 cursor-pointer">
                                    忘记密码？
                                </div>
                            </div>
                            <button className="flex justify-center mx-auto mt-12 text-2xl text-white bg-blue-500 w-35 rounded-2xl py-2 cursor-pointer"
                                onClick={handleLogin}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleLogin();
                                    }
                                }}>
                                登录
                            </button>
                        </div>
                    </div>

                </div>
            }
            {ShowRegister &&
                <>
                    <button
                        className="mt-18 text-blue-500"
                        onClick={() => {
                            setShowRegister(false)
                            setLoginForm({ identifier: '', password: '' });
                        }}>
                        ← 返回登录
                    </button>
                    <div className="">
                        <div className="text-blue-500 flex justify-center relative mt-8">
                            注册页
                        </div>
                        <div className="flex justify-center mt-10 text-2xl">
                            这里应该是一个Logo
                        </div>
                        <div className="mt-10 mx-auto w-70">
                            <div className="flex flex-col space-y-6 relative">
                                <div>
                                    <UserOutlined className='absolute left-2.5 top-3.5' />
                                    <input className="w-full border-gray-200 text-sm py-3 rounded-md pl-8 ring-gray-200 focus:ring-2 focus:outline-none bg-gray-100"
                                        placeholder="UserName"
                                        value={regForm.username}
                                        onChange={(e) =>
                                            setRegForm({ ...regForm, username: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <PhoneOutlined className='absolute left-2.5 top-20.5' />
                                    <input className="w-full border-gray-200 text-sm py-3 rounded-md pl-8 ring-gray-200 focus:ring-2 focus:outline-none bg-gray-100"
                                        placeholder="Phone"
                                        value={regForm.phone}
                                        onChange={(e) =>
                                            setRegForm({ ...regForm, phone: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <LockOutlined className='absolute left-2.5 top-37.5' />
                                    <input className="w-full border-gray-200 text-sm py-3 rounded-md pl-8 ring-gray-200 focus:ring-2 focus:outline-none bg-gray-100"
                                        placeholder="PassWord"
                                        type='password'
                                        value={regForm.password}
                                        onChange={(e) =>
                                            setRegForm({ ...regForm, password: e.target.value })
                                        }
                                    />
                                </div>

                                <button className="flex justify-center mx-auto mt-12 text-2xl text-white bg-blue-500 w-35 rounded-2xl py-2 cursor-pointer"
                                    onClick={handleRegister}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleRegister();
                                        }
                                    }}>
                                    注册
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            }
        </div>
    )
}