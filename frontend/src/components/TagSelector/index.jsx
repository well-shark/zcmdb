import React, { useState, useEffect } from 'react'
import { Select, Tag, Space, message } from 'antd'
import { getTags, createTag } from '@/api/tags'

const { Option } = Select

const TagSelector = ({ value = [], onChange }) => {
  const [allTags, setAllTags] = useState([])
  const [selectedTagIds, setSelectedTagIds] = useState(value || [])

  useEffect(() => {
    fetchTags()
  }, [])

  useEffect(() => {
    setSelectedTagIds(value || [])
  }, [value])

  const fetchTags = async () => {
    try {
      const response = await getTags()
      setAllTags(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error('加载标签列表失败', error)
    }
  }

  const handleChange = async (tagIds) => {
    setSelectedTagIds(tagIds)
    if (onChange) {
      onChange(tagIds)
    }
  }

  const handleRemove = (tagId) => {
    const newTagIds = selectedTagIds.filter(id => id !== tagId)
    setSelectedTagIds(newTagIds)
    if (onChange) {
      onChange(newTagIds)
    }
  }

  const selectedTags = allTags.filter(tag => selectedTagIds.includes(tag.id))

  return (
    <div>
      <Select
        mode="multiple"
        placeholder="选择标签"
        style={{ width: '100%' }}
        value={selectedTagIds}
        onChange={handleChange}
        allowClear
      >
        {allTags.map(tag => (
          <Option key={tag.id} value={tag.id}>
            {tag.key}={tag.value}
          </Option>
        ))}
      </Select>
      {selectedTags.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Space wrap>
            {selectedTags.map(tag => (
              <Tag
                key={tag.id}
                closable
                onClose={() => handleRemove(tag.id)}
              >
                {tag.key}={tag.value}
              </Tag>
            ))}
          </Space>
        </div>
      )}
    </div>
  )
}

export default TagSelector

