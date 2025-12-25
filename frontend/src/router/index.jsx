import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Users from '@/pages/Users'
import ServerAssets from '@/pages/Assets/Server'
import CloudAssets from '@/pages/Assets/Cloud'
import SoftwareAssets from '@/pages/Assets/Software'
import SystemAssets from '@/pages/Assets/System'
import DatabaseAssets from '@/pages/Assets/Database'
import HardwareAssets from '@/pages/Assets/Hardware'
import Tags from '@/pages/Tags'
import CloudAccounts from '@/pages/CloudAccounts'
import Notifications from '@/pages/Notifications'
import Settings from '@/pages/Settings'
import Profile from '@/pages/Profile'
import Migration from '@/pages/Migration'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'users',
        element: <Users />
      },
      {
        path: 'assets',
        children: [
          {
            index: true,
            element: <Navigate to="/assets/servers" replace />
          },
          {
            path: 'servers',
            element: <ServerAssets />
          },
          {
            path: 'cloud',
            element: <CloudAssets />
          },
          {
            path: 'cloud-accounts',
            element: <CloudAccounts />
          },
          {
            path: 'software',
            element: <SoftwareAssets />
          },
          {
            path: 'systems',
            element: <SystemAssets />
          },
          {
            path: 'databases',
            element: <DatabaseAssets />
          },
          {
            path: 'hardware',
            element: <HardwareAssets />
          }
        ]
      },
      {
        path: 'tags',
        element: <Tags />
      },
      {
        path: 'notifications',
        element: <Notifications />
      },
      {
        path: 'settings',
        element: <Settings />
      },
      {
        path: 'profile',
        element: <Profile />
      },
      {
        path: 'migration',
        element: <Migration />
      }
    ]
  }
])

