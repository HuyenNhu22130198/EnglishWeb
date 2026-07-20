package com.englishweb.be.repository.ielts;
import com.englishweb.be.entity.ielts.IeltsSpeakingItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface IeltsSpeakingItemRepository extends JpaRepository<IeltsSpeakingItem, Integer> {
    List<IeltsSpeakingItem> findBySpeakingTask_IdOrderByDisplayOrderAscIdAsc(Integer taskId);
}
