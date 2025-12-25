import React, { useState } from 'react'
import { Space, Button, message } from 'antd'
import { CopyOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/auth'

const PasswordDisplay = ({ value, showCopy = true, showToggle = false }) => {
  const { user } = useAuthStore()
  const [visible, setVisible] = useState(false)
  const isAdmin = user?.is_admin || false

  const handleCopy = async () => {
    if (!value) {
      message.warning('没有可复制的内容')
      return
    }
    
    try {
      await navigator.clipboard.writeText(value)
      message.success('已复制到剪贴板')
    } catch (error) {
      // 降级方案
      const textArea = document.createElement('textarea')
      textArea.value = value
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        message.success('已复制到剪贴板')
      } catch (err) {
        message.error('复制失败，请手动复制')
      }
      document.body.removeChild(textArea)
    }
  }

  if (!isAdmin) {
    // 普通用户只显示密文
    return <span>***</span>
  }

  // 管理员可以查看和复制
  const displayValue = visible ? value : '***'

  return (
    <Space>
      <span 
        style={{ 
          cursor: showCopy ? 'pointer' : 'default',
          userSelect: 'none'
        }}
        onClick={showCopy ? handleCopy : undefined}
        title={showCopy ? '点击复制密码' : undefined}
      >
        {displayValue}
      </span>
      {showToggle && value && (
        <Button
          type="text"
          size="small"
          icon={visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={() => setVisible(!visible)}
          title={visible ? '隐藏密码' : '显示密码'}
        />
      )}
      {showCopy && value && (
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          onClick={handleCopy}
          title="复制密码"
        />
      )}
    </Space>
  )
}

export default PasswordDisplay

