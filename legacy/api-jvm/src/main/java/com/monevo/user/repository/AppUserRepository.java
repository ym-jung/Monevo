package com.monevo.user.repository;

import com.monevo.user.entity.AppUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

	Optional<AppUser> findByIdAndDeletedAtIsNull(UUID id);

	List<AppUser> findByIdInAndDeletedAtIsNull(Collection<UUID> ids);

	Optional<AppUser> findByCognitoSub(UUID cognitoSub);

	Page<AppUser> findByStatusAndDeletedAtIsNull(AppUser.Status status, Pageable pageable);
}
