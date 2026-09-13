'use client';
import {usePathname} from 'next/navigation';
import SessionControls from './SessionControls';
export default function AccountBar(){const path=usePathname();return path==='/yeongnyangi/'||path==='/yeongnyangi'?null:<div className="service-account-bar"><a href="/yeongnyangi/">사주보는 영냥이</a><SessionControls compact/></div>;}
