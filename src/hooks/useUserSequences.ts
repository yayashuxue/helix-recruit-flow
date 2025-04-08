// 需要创建文件：src/hooks/useUserSequences.ts
import { useState, useEffect, useCallback } from "react";
import { Sequence } from "@/types/api";
import { sequenceApi } from "@/api/client";
import { toast } from "sonner";
import { API_CONFIG } from "@/config/appConfig";
import io from "socket.io-client";

interface UseUserSequencesProps {
  userId: string;
}

export const useUserSequences = ({ userId }: UseUserSequencesProps) => {
  const [userSequences, setUserSequences] = useState<Sequence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [currentSequence, setCurrentSequence] = useState<Sequence | null>(null);

  // 设置Socket.IO连接以处理实时更新
  useEffect(() => {
    // 连接Socket.IO服务器
    const socket = io(API_CONFIG.BASE_URL);
    
    // 处理sequence_deleted事件
    socket.on('sequence_deleted', (data: { id: string }) => {
      console.log('Socket event: sequence_deleted', data);
      
      // 从列表中移除已删除的序列
      setUserSequences((prev) => prev.filter((seq) => seq.id !== data.id));
      
      // 如果当前选中的序列被删除，清除选择
      if (selectedSequenceId === data.id) {
        setSelectedSequenceId(null);
        setCurrentSequence(null);
        toast.info("The sequence you were viewing has been deleted");
      }
    });
    
    // 处理sequence_updated事件，更新序列列表
    socket.on('sequence_updated', (updatedSequence: Sequence) => {
      console.log('Socket event: sequence_updated', updatedSequence);
      
      setUserSequences((prev) => {
        // 检查序列是否已存在
        const exists = prev.some((seq) => seq.id === updatedSequence.id);
        
        if (exists) {
          // 更新现有序列
          return prev.map((seq) => 
            seq.id === updatedSequence.id ? updatedSequence : seq
          );
        } else {
          // 添加新序列
          return [...prev, updatedSequence];
        }
      });
    });
    
    // 组件卸载时断开连接
    return () => {
      socket.disconnect();
    };
  }, [selectedSequenceId]);

  // 获取所有用户序列
  const fetchUserSequences = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await sequenceApi.list(userId);
      console.log("API Response for sequences:", response);
      
      if (response.success && response.data) {
        // 确保数据是数组格式
        const sequences = Array.isArray(response.data) 
          ? response.data 
          : (typeof response.data === 'object' && response.data !== null && 'data' in response.data && Array.isArray(response.data.data)) 
            ? response.data.data 
            : [];
            
        console.log("Setting sequences:", sequences);
        setUserSequences(sequences);
      } else {
        console.error("Failed to fetch user sequences:", response.error);
        toast.error("Failed to load your sequences");
      }
    } catch (error) {
      console.error("Error fetching user sequences:", error);
      toast.error("Error loading your sequences");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 获取特定序列
  const fetchSequence = useCallback(async (sequenceId: string) => {
    if (!sequenceId) return null;
    
    setIsLoading(true);
    try {
      const response = await sequenceApi.get(sequenceId);
      if (response.success && response.data) {
        setCurrentSequence(response.data);
        return response.data;
      } else {
        console.error("Failed to fetch sequence:", response.error);
        toast.error("Failed to load sequence");
        return null;
      }
    } catch (error) {
      console.error("Error fetching sequence:", error);
      toast.error("Error loading sequence");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 选择序列
  const selectSequence = useCallback(async (sequenceId: string) => {
    setSelectedSequenceId(sequenceId);
    const sequence = await fetchSequence(sequenceId);
    return sequence;
  }, [fetchSequence]);
  
  // 删除序列
  const deleteSequence = useCallback(async (sequenceId: string) => {
    if (!sequenceId) return false;
    
    setIsLoading(true);
    try {
      // Call delete API endpoint - you'll need to add this to your API client
      const response = await sequenceApi.delete(sequenceId);
      
      if (response.success) {
        // Update the local state by removing the deleted sequence
        setUserSequences(prev => prev.filter(seq => seq.id !== sequenceId));
        
        // Clear currentSequence if it's the one being deleted
        if (currentSequence && currentSequence.id === sequenceId) {
          setCurrentSequence(null);
          setSelectedSequenceId(null);
        }
        
        console.log("Sequence deleted successfully:", sequenceId);
        return true;
      } else {
        console.error("Failed to delete sequence:", response.error);
        toast.error("Failed to delete sequence");
        return false;
      }
    } catch (error) {
      console.error("Error deleting sequence:", error);
      toast.error("Error deleting sequence");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentSequence]);

  // 调试状态变化
  useEffect(() => {
    console.log("userSequences state updated:", {
      count: userSequences?.length || 0,
      isArray: Array.isArray(userSequences),
      firstItem: userSequences?.[0]
    });
  }, [userSequences]);

  // 初始加载
  useEffect(() => {
    if (userId) {
      console.log("Initial fetch of sequences for userId:", userId);
      fetchUserSequences();
    }
  }, [userId, fetchUserSequences]);

  return {
    userSequences,
    isLoading,
    selectedSequenceId,
    currentSequence,
    fetchUserSequences,
    selectSequence,
    fetchSequence,
    deleteSequence
  };
};