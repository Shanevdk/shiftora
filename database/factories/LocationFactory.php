<?php

namespace Database\Factories;

use App\Models\Location;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Location>
 */
class LocationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'name' => fake()->city().' '.fake()->randomElement(['Store', 'Depot', 'Warehouse', 'Kitchen']),
            'address' => fake()->streetAddress(),
            'latitude' => null,
            'longitude' => null,
            'geofence_radius_meters' => 150,
        ];
    }

    /**
     * Give the location a geofence centred on the given coordinates.
     */
    public function geofenced(float $latitude = 43.6532, float $longitude = -79.3832, int $radiusInMeters = 150): static
    {
        return $this->state(fn (array $attributes) => [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'geofence_radius_meters' => $radiusInMeters,
        ]);
    }
}
